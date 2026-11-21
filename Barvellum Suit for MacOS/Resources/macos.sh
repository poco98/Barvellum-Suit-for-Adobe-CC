#!/bin/bash
set -euo pipefail

fail() { printf '%s\n' "$1" >&2; exit 1; }

[[ $(uname -s) == Darwin ]] || fail 'Use Install.cmd or Uninstall.cmd on Windows.'
if pgrep -f 'Adobe (Illustrator|Photoshop|InDesign)[^/]*\.app/Contents/MacOS/' >/dev/null; then
    fail 'Close Illustrator, Photoshop and InDesign, then try again.'
fi

resources="$(cd -- "$(dirname -- "$0")" && pwd)"
support="$HOME/Library/Application Support"
extension_root="$support/Adobe/CEP/extensions"
destination="$extension_root/afd.barvellum.suit"
state="$support/Barvellum.Suit"
backup="$state/macos-cep-preferences"
font="$HOME/Library/Fonts/AmazonEmber_Rg.ttf"
key=PlayerDebugMode

owned_extension() {
    [[ -d "$1" && ! -L "$1" && -f "$1/CSXS/manifest.xml" ]] &&
        grep -Fq 'ExtensionBundleId="afd.barvellum.suit"' "$1/CSXS/manifest.xml"
}

if [[ -e "$destination" || -L "$destination" ]]; then
    owned_extension "$destination" || fail "The extension folder could not be identified: $destination"
fi

save_preference() {
    local domain="$1" file="$2" kind
    if kind=$(LC_ALL=C defaults read-type "$domain" "$key" 2>/dev/null); then
        case "$kind" in
            'Type is string') printf '%s\n' '-string' > "$file" ;;
            'Type is boolean') printf '%s\n' '-bool' > "$file" ;;
            'Type is integer') printf '%s\n' '-int' > "$file" ;;
            'Type is float') printf '%s\n' '-float' > "$file" ;;
            *) fail "Unexpected preference type for $domain $key: $kind" ;;
        esac
        defaults read "$domain" "$key" >> "$file"
    else
        printf '%s\n' 'absent' > "$file"
    fi
}

restore_preference() {
    local domain="$1" file="$2" kind value
    [[ -f "$file" ]] || return 0
    IFS= read -r kind < "$file"
    case "$kind" in
        absent)
            if defaults read "$domain" "$key" >/dev/null 2>&1; then
                defaults delete "$domain" "$key"
            fi
            ;;
        -string|-bool|-int|-float)
            value=$(tail -n +2 "$file")
            defaults write "$domain" "$key" "$kind" "$value"
            ;;
        *) return 1 ;;
    esac
}

case "${1:-}" in
    install)
        owned_extension "$resources/extension" || fail 'Extract the complete ZIP before installing.'
        [[ -f "$resources/extension/fonts/AmazonEmber_Rg.ttf" ]] || fail 'Amazon Ember Regular is missing from the package.'
        mkdir -p "$extension_root" "$state" "$(dirname -- "$font")"
        ;;
    uninstall)
        if [[ ! -d "$destination" && ! -d "$backup" ]]; then
            printf '%s\n' 'Barvellum Suit is already uninstalled.'
            exit 0
        fi
        mkdir -p "$state"
        ;;
    *) fail 'Run Install.command or Uninstall.command from the extracted package.' ;;
esac

lock="$state/.macos-setup-lock"
mkdir "$lock" 2>/dev/null || fail 'Another Barvellum Suit installation or removal is in progress.'
stage=''
preferences_changed=0
font_added=0
panel_swapped=0
complete=0
cleanup() {
    local code=$? version
    trap - EXIT
    if [[ "$complete" == 0 ]]; then
        if [[ "$preferences_changed" == 1 ]]; then
            for version in 11 12; do
                restore_preference "com.adobe.CSXS.$version" "$stage/prefs/$version" ||
                    printf '%s\n' "Could not restore com.adobe.CSXS.$version." >&2
            done
        fi
        if [[ "$panel_swapped" == 1 ]]; then rm -rf -- "$destination"; fi
        if [[ -n "$stage" && -d "$stage/previous" ]]; then
            mv -- "$stage/previous" "$destination" || { printf '%s\n' "Previous panel retained at $stage/previous." >&2; stage=''; }
        fi
        if [[ "$font_added" == 1 ]]; then rm -f -- "$font"; fi
    fi
    if [[ -n "$stage" ]]; then rm -rf -- "$stage"; fi
    rmdir "$lock"
    exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$1" == install ]]; then
    stage=$(mktemp -d "$extension_root/.barvellum-install.XXXXXX")
    cp -R "$resources/extension" "$stage/extension"
    mkdir "$stage/prefs"
    for version in 11 12; do save_preference "com.adobe.CSXS.$version" "$stage/prefs/$version"; done
    if [[ ! -e "$font" && ! -L "$font" ]]; then
        font_added=1
        cp "$resources/extension/fonts/AmazonEmber_Rg.ttf" "$font"
    fi
    if [[ -d "$destination" ]]; then mv -- "$destination" "$stage/previous"; fi
    mv -- "$stage/extension" "$destination"
    panel_swapped=1

    preferences_changed=1
    for version in 11 12; do defaults write "com.adobe.CSXS.$version" "$key" -string '1'; done
    if [[ ! -d "$backup" ]]; then cp -R "$stage/prefs" "$backup"; fi
    complete=1
    printf '%s\n' 'Barvellum Suit for Adobe CC installed.' 'Open Window > Extensions in Illustrator or InDesign. In Photoshop, open Extensions (Legacy).'
else
    # Keep the panel and the current preferences available until removal succeeds.
    staging_root="$extension_root"
    if [[ ! -d "$extension_root" ]]; then staging_root="$state"; fi
    stage=$(mktemp -d "$staging_root/.barvellum-uninstall.XXXXXX")
    mkdir "$stage/prefs"
    for version in 11 12; do save_preference "com.adobe.CSXS.$version" "$stage/prefs/$version"; done
    if [[ -d "$destination" ]]; then mv -- "$destination" "$stage/previous"; fi
    preferences_changed=1
    for version in 11 12; do
        domain="com.adobe.CSXS.$version"
        if [[ $(defaults read "$domain" "$key" 2>/dev/null || true) == 1 ]]; then
            restore_preference "$domain" "$backup/$version"
        fi
    done
    rm -f -- "$backup/11" "$backup/12"
    if [[ -d "$backup" ]]; then rmdir "$backup"; fi
    complete=1
    printf '%s\n' 'Panel removed. The product database, assets and font have been preserved.'
fi
