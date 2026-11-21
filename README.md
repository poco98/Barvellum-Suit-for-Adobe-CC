# Barvellum Suit for Adobe CC

Extensão CEP para gerar, ler, verificar e inserir códigos de barras e códigos QR no **Adobe Illustrator**, **Adobe Photoshop** e **Adobe InDesign**. Desenvolvida por André Filipe.

## Funcionalidades

- Gera códigos de barras a partir de um valor introduzido manualmente ou de uma referência da base de dados.
- Valida o dígito de controlo dos formatos GTIN compatíveis e permite ler códigos em imagens PNG ou JPEG.
- Cria códigos QR para endereços HTTP e HTTPS. Confirma separadamente o conteúdo do QR e a disponibilidade do endereço.
- Exporta em SVG e PNG a 600 ppi. No Illustrator, o texto do código de barras mantém-se editável.
- Importa dados de produtos em XLSX, CSV e JSON. Inclui um modelo XLSX para preservar zeros à esquerda, pesquisa por referência ou código de barras e cópias de segurança em JSON.

## Compatibilidade

| Aplicação | Versões configuradas no manifesto CEP | Menu do painel |
| --- | --- | --- |
| Adobe Illustrator | 29.0 a 31.9 | **Window → Extensions** |
| Adobe Photoshop | 26.0 a 28.9 | **Window → Extensions (Legacy)** |
| Adobe InDesign | 20.0 a 22.9 | **Window → Extensions** |

A extensão requer CEP (CSXS 11.0 ou posterior) e uma aplicação que carregue extensões CEP. Os intervalos indicam a configuração do manifesto. A versão 1.6.2 inclui relatórios de teste com um ambiente CEP simulado.

## Instalação

Escolhe na secção **Releases** o ZIP correspondente ao teu sistema.

| Sistema | Pacote v1.6.2 | Instalador |
| --- | --- | --- |
| Windows | `Barvellum_Suit_for_Windows_1.6.2.zip` | `Install.cmd` |
| macOS | `Barvellum_Suit_for_MacOS_1.6.2.zip` | `Install.command` |

1. Extrai o ZIP completo e fecha as aplicações Adobe.
2. Executa o instalador a partir da pasta extraída. No macOS, também podes abrir o Terminal nessa pasta e correr `/bin/bash Install.command`.
3. Volta a abrir a aplicação Adobe e escolhe **Barvellum Suit for Adobe CC** no menu indicado na tabela de compatibilidade.

O instalador activa a preferência `PlayerDebugMode` no perfil do utilizador, para que o CEP carregue esta versão sem assinatura. A actualização pelo instalador preserva a base de dados local.

## Primeiros passos

1. **Barcode** — Escolhe o formato, introduz o valor ou pesquisa uma referência e selecciona **Generate & analyze**. Revê o formato gerado antes de inserir ou exportar.
2. **QR link** — Introduz o endereço e selecciona **Analyze QR & link**. Revê **QR reading** e **Link availability** antes de inserir ou exportar.
3. **Analyze** — Carrega uma imagem PNG ou JPEG com um código para ler o valor e compará-lo com o valor esperado.
4. **Database** — Usa **Save XLSX template…**, preenche as colunas **Reference** e **Barcode** e importa o ficheiro. Guardar a importação substitui a tabela actual. Usa **Export backup** para guardar uma cópia da tabela antes da importação.

Para EAN-13, introduz 13 dígitos, incluindo o dígito de controlo. Se este estiver incorrecto, o painel gera Code 128 com os 13 dígitos originais e identifica o formato utilizado. **Use EAN-13** aplica o dígito de controlo calculado à pré-visualização. Confirma a correspondência com o artigo antes de usar o código corrigido.

## Desinstalação

Fecha as aplicações Adobe e executa `Uninstall.cmd` no Windows ou `Uninstall.command` no macOS. O guia técnico incluído em `Resources/README.md` descreve como restaurar as preferências de CEP.

## Documentação

- [Histórico de versões](CHANGELOG.md)
- [Notas da versão 1.6.2](RELEASE_NOTES.md)
- Nos ZIP de instalação, consulta `Resources/README.md` para detalhes técnicos e `Resources/FORMATS.csv` para a lista de formatos.

## Créditos e licenças

Desenvolvimento por **André Filipe**. A [licença MIT](LICENSE) aplica-se ao código e à documentação originais do projecto.

As bibliotecas de terceiros mantêm as respectivas licenças em `Resources/extension/vendor/`. O guia da fonte Amazon Ember encontra-se em `Resources/extension/fonts/`. A autorização para redistribuir a fonte está por confirmar.
