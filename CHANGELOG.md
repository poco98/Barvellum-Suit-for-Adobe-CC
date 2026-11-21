# Changelog

Histórico de versões do Barvellum Suit for Adobe CC, da mais recente à mais antiga. Os valores indicados em cada entrada aplicam-se à versão correspondente.

## [1.6.2](RELEASE_NOTES.md)

### Corrigido

- Aumentado o espaço no rodapé junto aos controlos de ancoragem da Adobe para manter visível o crédito «by André Filipe».
- O rodapé apresenta a mensagem do separador activo. Uma verificação de QR concluída em segundo plano guarda o resultado no separador **QR link** sem substituir a mensagem que o utilizador está a ver.

## 1.6.1

### Alterado

- Interface escura actualizada com controlos azuis, cantos arredondados e mensagens diferenciadas por cor.
- Pesquisa de artigos e definições do código de barras reunidas no mesmo editor, com acesso às opções avançadas.
- Editor e pré-visualização lado a lado em painéis mais largos.

## 1.6.0

### Adicionado

- Pacotes autónomos para Windows e macOS, com instalação, desinstalação e documentação específicas para cada sistema.
- Instalação CEP por utilizador no macOS, com reposição das preferências de CEP através do desinstalador.

### Alterado

- No macOS, a base de dados e os ficheiros gerados passaram a ser guardados em **Application Support**. A importação da base de dados e de imagens passou a usar filtros de ficheiro próprios do sistema.

### Validação

- Verificadas a estrutura do pacote Windows e as referências dos instaladores. O comportamento do instalador para macOS e a integração com os anfitriões Adobe foram verificados em simulação.

## 1.5.14

### Adicionado

- A acção **Save XLSX template…** cria um modelo em branco e permite escolher o nome e a pasta de destino. As colunas **Reference** e **Barcode** usam formato de texto para preservar zeros à esquerda.

### Alterado

- O guia rápido passou para `readme.txt`, com instruções de instalação, utilização e desinstalação.

## 1.5.13

### Alterado

- Nome do painel e do menu Adobe actualizado para **Barvellum Suit for Adobe CC**.
- Tema cinzento neutro com base em `#181818`.
- Separador **Verify** renomeado para **Analyze** e designações das acções de códigos de barras e QR uniformizadas.

## 1.5.12

### Alterado

- Separador **Help** actualizado com instruções sobre códigos de barras, dimensões predefinidas, inserção no Illustrator e verificações de QR.
- O grupo de texto editável no Illustrator passou a receber o código de barras completo como nome, incluindo zeros à esquerda.

## 1.5.11

### Alterado

- Cinco separadores reorganizados num painel compacto em tons de grafite, com fundo claro na pré-visualização para facilitar a leitura dos códigos.

## 1.5.10

### Corrigido

- A distância entre o primeiro dígito do EAN-13 e a primeira barra de guarda passou para o dobro da dimensão X na pré-visualização, nas exportações e nos códigos inseridos.

## 1.5.9

### Alterado

- Painel renomeado para **Barvellum Suit**, com o identificador CEP `afd.barvellum.suit`.
- Migração dos dados e das definições de instalações anteriores no Windows para `%APPDATA%\Barvellum.Suit`. Os dados anteriores são preservados e as extensões antigas reconhecidas podem ser arquivadas.
- Cópia de segurança da base de dados renomeada para `barvellum_suit_products.json`.

## 1.5.8

### Adicionado

- Suporte para UTF-8, UTF-16 e Windows-1252 na importação de CSV, TSV e TXT.

### Corrigido

- Utilização de Code 128 para valores de 8, 12 e 14 dígitos da base de dados cujo dígito de controlo GTIN é inválido.
- Aceitação de referências como `1E5` e `4E7`, com rejeição de valores convertidos pela folha de cálculo para notação científica.
- Limpeza de ficheiros gráficos temporários com mais de 24 horas.

## 1.5.7

### Corrigido

- Posição do texto mantida entre gerações do código ao evitar o registo repetido da fonte de pré-visualização.

## 1.5.6

### Adicionado

- A opção **Use EAN-13** propõe o dígito de controlo calculado após a geração em Code 128 e aplica-o quando seleccionada.

### Alterado

- A lista da base de dados permanece recolhida após a importação. A pesquisa abre a lista filtrada e limpar a pesquisa volta a recolhê-la.

## 1.5.5

### Alterado

- Nomes dos pacotes e dos instaladores uniformizados em inglês. Nesta versão, a pasta CEP chamava-se `afd.barcode.studio`.

## 1.5.4

### Alterado

- Distância vertical entre as barras e o texto definida em 0,80 mm.
- Barras e texto separados na inserção no Illustrator e na exportação SVG. O texto continua editável no Illustrator.
- Pasta de instalação reorganizada com dois atalhos e um guia rápido.

## 1.5.3

### Alterado

- O EAN-13 passou a exigir 13 dígitos. Um dígito de controlo válido gera EAN-13. Um dígito inválido gera Code 128 com os 13 dígitos originais.
- Dimensões predefinidas nesta versão de 0,45 mm para a dimensão X, 13 mm para a altura das barras e 0,50 mm para a distância ao texto. A migração preserva dimensões personalizadas.

## 1.5.2

### Corrigido

- Texto dos códigos lineares deslocado 1 mm para baixo na pré-visualização, no Illustrator e nas exportações.

## 1.5.1

### Adicionado

- Tamanhos de saída QR de 10 a 200 mm, condicionados pelo comprimento do endereço e pelo tamanho escolhido.

### Alterado

- Altura das barras definida em 12 mm para uma dimensão X de 0,40 mm, com barras de guarda mais longas nos formatos que as exigem.

### Corrigido

- Área de exportação ajustada a textos mais longos. A versão apresentada após a instalação passou a corresponder ao manifesto.

## 1.5

### Alterado

- Texto em Amazon Ember Regular a 14 pt, editável no Illustrator.
- Fundo transparente nos códigos de barras e fundo branco com raio de 1,844 mm nos cantos dos QR, quando o tamanho o permite. As saídas SVG e PNG passaram a corresponder ao grafismo inserido.
- Altura predefinida das barras de 12 mm. O valor predefinido anterior de 10 mm é actualizado e os restantes valores guardados são preservados.
- Ficheiros exportados de códigos de barras nomeados pelo valor codificado, incluindo zeros à esquerda.

## 1.4

### Adicionado

- Geração de códigos de barras e QR compatíveis directamente no Illustrator, como grupos de traçados preenchidos. A importação por SVG mantém-se para formas que a exigem.

### Alterado

- Texto editável em Amazon Ember Regular a 10,5 pt nesta versão. Aplicação de 100% K ao inserir elementos pretos em documentos CMYK do Illustrator.

### Corrigido

- O grafismo fica no documento quando a inserção é bem-sucedida e falha apenas a selecção final.

## 1.3

### Alterado

- Texto em Amazon Ember convertido em contornos para inserção no InDesign e no Photoshop. O texto permanece editável no Illustrator e nos SVG exportados.
- Erros de inserção apresentados junto à acção e última etapa registada em **Help → Diagnostics**.
- Cabeçalhos em falta ou repetidos aceites nas colunas adicionais. Auditoria alargada a UPC-A e ITF-14, além de EAN-8 e EAN-13.

### Corrigido

- Dimensionamento no Illustrator a partir dos limites do grafismo importado quando correspondem às proporções do SVG.
- Validação da página e da moldura de destino no InDesign, com reposição das preferências em caso de falha.
- Redimensionamento proporcional do objecto inteligente no Photoshop, com reversão em caso de falha na inserção.
- Aplicação de um limite de tempo às verificações de endereços desde o início do pedido de ligação.
