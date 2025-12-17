# Processamento Adaptativo de Imagens em Baixa Luminosidade

Este repositório apresenta uma aplicação experimental para **realce de imagens em condições de baixa luminosidade**, baseada no método proposto por **Zahi & Yue (2017)**. O objetivo do projeto é estudar, implementar e comparar técnicas de realce de contraste aplicadas a imagens digitais.

---

## Objetivo

Implementar e avaliar um método adaptativo de realce de imagens de baixa luminosidade, comparando-o com técnicas clássicas como:

* Transformação logarítmica
* Mapeamento tonal
* Equalização de histograma

---

## Metodologia

O método proposto baseia-se na análise do histograma da imagem para estimar o nível global de luminância. A partir dessa estimativa:

1. A imagem é classificada em três categorias (escura, mista ou clara);
2. Parâmetros adaptativos são calculados automaticamente;
3. Aplica-se uma transformação híbrida que combina transformação logarítmica e função identidade.

A implementação foi realizada em **JavaScript**, utilizando **React** e a **Canvas API** para manipulação direta dos pixels da imagem.

---

## Funcionalidades Implementadas

* Carregamento de imagens locais
* Processamento em tempo real
* Comparação visual entre imagem original e processada
* Seleção de diferentes métodos de realce
* Ajuste do parâmetro (\lambda) para estimação de luminância
* Exportação da imagem processada

---

## Tecnologias Utilizadas

* React
* Canvas API
* Tailwind CSS

---

## Execução do Projeto

### Requisitos

* Node.js (≥ 16)
* npm

### Passos

```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

## Referência

Zahi, A., & Yue, Y. (2017). *Adaptive Enhancement of Low-Light Images Based on Histogram Analysis*. Computing Conference.

---

## Considerações Finais

Este projeto possui caráter **acadêmico e experimental**, sendo indicado para estudos em processamento digital de imagens, visão computacional e análise de algoritmos de realce.
