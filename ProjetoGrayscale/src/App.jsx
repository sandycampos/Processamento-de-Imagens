import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Image as ImageIcon, Sliders } from 'lucide-react';

const SistemaProcessamentoImagens = () => {
  const [imagemOriginal, setImagemOriginal] = useState(null);
  const [imagemProcessada, setImagemProcessada] = useState(null);
  const [dadosImagem, setDadosImagem] = useState(null);
  const [operacaoSelecionada, setOperacaoSelecionada] = useState('');
  const [parametros, setParametros] = useState({});
  
  const canvasRef = useRef(null);
  const canvasResultadoRef = useRef(null);
  const inputArquivoRef = useRef(null);

  // Carrega imagem e converte para grayscale
  const carregarImagem = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (evento) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const dadosImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dadosGrayscale = converterParaGrayscale(dadosImg);
        
        ctx.putImageData(dadosGrayscale, 0, 0);
        setImagemOriginal(canvas.toDataURL());
        setDadosImagem(dadosGrayscale);
        setImagemProcessada(null);
      };
      img.src = evento.target.result;
    };
    leitor.readAsDataURL(arquivo);
  };

  // Converte para grayscale
  const converterParaGrayscale = (dadosImg) => {
    const dados = new Uint8ClampedArray(dadosImg.data);
    for (let i = 0; i < dados.length; i += 4) {
      const cinza = 0.299 * dados[i] + 0.587 * dados[i + 1] + 0.114 * dados[i + 2];
      dados[i] = dados[i + 1] = dados[i + 2] = cinza;
    }
    return new ImageData(dados, dadosImg.width, dadosImg.height);
  };

  // Operações Algébricas - Dissolve Cruzado
  const dissolveCruzado = (dadosImg1, dadosImg2, alfa) => {
    const resultado = new Uint8ClampedArray(dadosImg1.data);
    for (let i = 0; i < resultado.length; i += 4) {
      resultado[i] = resultado[i + 1] = resultado[i + 2] = 
        alfa * dadosImg1.data[i] + (1 - alfa) * dadosImg2.data[i];
    }
    return new ImageData(resultado, dadosImg1.width, dadosImg1.height);
  };

  // Transformação de Intensidade - Negativo
  const negativo = (dadosImg) => {
    const resultado = new Uint8ClampedArray(dadosImg.data);
    for (let i = 0; i < resultado.length; i += 4) {
      resultado[i] = resultado[i + 1] = resultado[i + 2] = 255 - dadosImg.data[i];
    }
    return new ImageData(resultado, dadosImg.width, dadosImg.height);
  };

  // Alargamento de Contraste
  const alargamentoContraste = (dadosImg, r1, s1, r2, s2) => {
    const resultado = new Uint8ClampedArray(dadosImg.data);
    for (let i = 0; i < resultado.length; i += 4) {
      const r = dadosImg.data[i];
      let s;
      if (r < r1) {
        s = (s1 / r1) * r;
      } else if (r < r2) {
        s = ((s2 - s1) / (r2 - r1)) * (r - r1) + s1;
      } else {
        s = ((255 - s2) / (255 - r2)) * (r - r2) + s2;
      }
      resultado[i] = resultado[i + 1] = resultado[i + 2] = Math.min(255, Math.max(0, s));
    }
    return new ImageData(resultado, dadosImg.width, dadosImg.height);
  };

  // Limiarização
  const liarizacao = (dadosImg, limiar) => {
    const resultado = new Uint8ClampedArray(dadosImg.data);
    for (let i = 0; i < resultado.length; i += 4) {
      const valor = dadosImg.data[i] >= limiar ? 255 : 0;
      resultado[i] = resultado[i + 1] = resultado[i + 2] = valor;
    }
    return new ImageData(resultado, dadosImg.width, dadosImg.height);
  };

  // Transformação de Potência (Gamma)
  const transformacaoPotencia = (dadosImg, gama, c = 1) => {
    const resultado = new Uint8ClampedArray(dadosImg.data);
    for (let i = 0; i < resultado.length; i += 4) {
      const normalizado = dadosImg.data[i] / 255;
      const valor = c * Math.pow(normalizado, gama) * 255;
      resultado[i] = resultado[i + 1] = resultado[i + 2] = Math.min(255, Math.max(0, valor));
    }
    return new ImageData(resultado, dadosImg.width, dadosImg.height);
  };

  // Transformação Logarítmica
  const transformacaoLogaritmica = (dadosImg, c = 1) => {
    const resultado = new Uint8ClampedArray(dadosImg.data);
    for (let i = 0; i < resultado.length; i += 4) {
      const valor = c * Math.log(1 + dadosImg.data[i]) * (255 / Math.log(256));
      resultado[i] = resultado[i + 1] = resultado[i + 2] = Math.min(255, Math.max(0, valor));
    }
    return new ImageData(resultado, dadosImg.width, dadosImg.height);
  };

  // Expansão de Histograma
  const expansaoHistograma = (dadosImg) => {
    const dados = dadosImg.data;
    let minimo = 255, maximo = 0;
    
    for (let i = 0; i < dados.length; i += 4) {
      minimo = Math.min(minimo, dados[i]);
      maximo = Math.max(maximo, dados[i]);
    }
    
    const resultado = new Uint8ClampedArray(dados);
    for (let i = 0; i < resultado.length; i += 4) {
      const valor = ((dados[i] - minimo) / (maximo - minimo)) * 255;
      resultado[i] = resultado[i + 1] = resultado[i + 2] = valor;
    }
    return new ImageData(resultado, dadosImg.width, dadosImg.height);
  };

  // Equalização de Histograma
  const equalizacaoHistograma = (dadosImg) => {
    const dados = dadosImg.data;
    const histograma = new Array(256).fill(0);
    const totalPixels = dados.length / 4;
    
    for (let i = 0; i < dados.length; i += 4) {
      histograma[dados[i]]++;
    }
    
    const cdf = new Array(256);
    cdf[0] = histograma[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histograma[i];
    }
    
    const resultado = new Uint8ClampedArray(dados);
    for (let i = 0; i < resultado.length; i += 4) {
      const valor = Math.round((cdf[dados[i]] / totalPixels) * 255);
      resultado[i] = resultado[i + 1] = resultado[i + 2] = valor;
    }
    return new ImageData(resultado, dadosImg.width, dadosImg.height);
  };

  // Controle de Contraste Adaptativo
  const contrasteAdaptativo = (dadosImg, n, c) => {
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const dados = dadosImg.data;
    const resultado = new Uint8ClampedArray(dados);
    const metade = Math.floor(n / 2);
    
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        let soma = 0, contador = 0;
        
        for (let dy = -metade; dy <= metade; dy++) {
          for (let dx = -metade; dx <= metade; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < largura && ny >= 0 && ny < altura) {
              soma += dados[(ny * largura + nx) * 4];
              contador++;
            }
          }
        }
        
        const media = soma / contador;
        const indice = (y * largura + x) * 4;
        const pixel = dados[indice];
        const valor = pixel + c * (pixel - media);
        resultado[indice] = resultado[indice + 1] = resultado[indice + 2] = Math.min(255, Math.max(0, valor));
      }
    }
    return new ImageData(resultado, largura, altura);
  };

  // Interpolação Bilinear
  const interpolacaoBilinear = (dados, largura, altura, x, y) => {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, largura - 1);
    const y2 = Math.min(y1 + 1, altura - 1);
    
    const dx = x - x1;
    const dy = y - y1;
    
    const p11 = dados[(y1 * largura + x1) * 4] || 0;
    const p21 = dados[(y1 * largura + x2) * 4] || 0;
    const p12 = dados[(y2 * largura + x1) * 4] || 0;
    const p22 = dados[(y2 * largura + x2) * 4] || 0;
    
    return (1 - dx) * (1 - dy) * p11 + dx * (1 - dy) * p21 + 
           (1 - dx) * dy * p12 + dx * dy * p22;
  };

  // Mudança de Escala
  const mudancaEscala = (dadosImg, escalaX, escalaY) => {
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const novaLargura = Math.round(largura * escalaX);
    const novaAltura = Math.round(altura * escalaY);
    const resultado = new Uint8ClampedArray(novaLargura * novaAltura * 4);
    
    for (let y = 0; y < novaAltura; y++) {
      for (let x = 0; x < novaLargura; x++) {
        const origemX = x / escalaX;
        const origemY = y / escalaY;
        const valor = interpolacaoBilinear(dadosImg.data, largura, altura, origemX, origemY);
        const indice = (y * novaLargura + x) * 4;
        resultado[indice] = resultado[indice + 1] = resultado[indice + 2] = valor;
        resultado[indice + 3] = 255;
      }
    }
    return new ImageData(resultado, novaLargura, novaAltura);
  };

  // Rotação
  const rotacao = (dadosImg, angulo) => {
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const radianos = (angulo * Math.PI) / 180;
    const cosseno = Math.cos(radianos);
    const seno = Math.sin(radianos);
    const centroX = largura / 2;
    const centroY = altura / 2;
    
    const resultado = new Uint8ClampedArray(dadosImg.data.length).fill(0);
    
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const dx = x - centroX;
        const dy = y - centroY;
        const origemX = dx * cosseno + dy * seno + centroX;
        const origemY = -dx * seno + dy * cosseno + centroY;
        
        if (origemX >= 0 && origemX < largura && origemY >= 0 && origemY < altura) {
          const valor = interpolacaoBilinear(dadosImg.data, largura, altura, origemX, origemY);
          const indice = (y * largura + x) * 4;
          resultado[indice] = resultado[indice + 1] = resultado[indice + 2] = valor;
          resultado[indice + 3] = 255;
        }
      }
    }
    return new ImageData(resultado, largura, altura);
  };

  // Cisalhamento
  const cisalhamento = (dadosImg, cisalhaX, cisalhaY) => {
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const resultado = new Uint8ClampedArray(dadosImg.data.length).fill(0);
    
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const origemX = x - cisalhaX * y;
        const origemY = y - cisalhaY * x;
        
        if (origemX >= 0 && origemX < largura && origemY >= 0 && origemY < altura) {
          const valor = interpolacaoBilinear(dadosImg.data, largura, altura, origemX, origemY);
          const indice = (y * largura + x) * 4;
          resultado[indice] = resultado[indice + 1] = resultado[indice + 2] = valor;
          resultado[indice + 3] = 255;
        }
      }
    }
    return new ImageData(resultado, largura, altura);
  };

  // Rebatimento (Flip)
  const rebatimento = (dadosImg, horizontal) => {
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const resultado = new Uint8ClampedArray(dadosImg.data);
    
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const origemX = horizontal ? largura - 1 - x : x;
        const origemY = horizontal ? y : altura - 1 - y;
        const indiceOrigem = (origemY * largura + origemX) * 4;
        const indiceDestino = (y * largura + x) * 4;
        resultado[indiceDestino] = resultado[indiceDestino + 1] = resultado[indiceDestino + 2] = dadosImg.data[indiceOrigem];
      }
    }
    return new ImageData(resultado, largura, altura);
  };

  // Convolução Genérica
  const convolucao = (dadosImg, mascara, deslocamento = 0) => {
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const dados = dadosImg.data;
    const resultado = new Uint8ClampedArray(dados);
    const alturaMascara = mascara.length;
    const larguraMascara = mascara[0].length;
    const metadeAltura = Math.floor(alturaMascara / 2);
    const metadeLargura = Math.floor(larguraMascara / 2);
    
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        let soma = 0;
        
        for (let my = 0; my < alturaMascara; my++) {
          for (let mx = 0; mx < larguraMascara; mx++) {
            const nx = x + mx - metadeLargura;
            const ny = y + my - metadeAltura;
            
            if (nx >= 0 && nx < largura && ny >= 0 && ny < altura) {
              soma += dados[(ny * largura + nx) * 4] * mascara[my][mx];
            }
          }
        }
        
        const indice = (y * largura + x) * 4;
        const valor = Math.min(255, Math.max(0, soma + deslocamento));
        resultado[indice] = resultado[indice + 1] = resultado[indice + 2] = valor;
      }
    }
    return new ImageData(resultado, largura, altura);
  };

  // Filtro de Média
  const filtroMedia = (dadosImg, tamanho) => {
    const mascara = Array(tamanho).fill().map(() => Array(tamanho).fill(1 / (tamanho * tamanho)));
    return convolucao(dadosImg, mascara);
  };

  // Filtro de Mediana
  const filtroMediana = (dadosImg, tamanho) => {
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const dados = dadosImg.data;
    const resultado = new Uint8ClampedArray(dados);
    const metade = Math.floor(tamanho / 2);
    
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const valores = [];
        
        for (let dy = -metade; dy <= metade; dy++) {
          for (let dx = -metade; dx <= metade; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < largura && ny >= 0 && ny < altura) {
              valores.push(dados[(ny * largura + nx) * 4]);
            }
          }
        }
        
        valores.sort((a, b) => a - b);
        const mediana = valores[Math.floor(valores.length / 2)];
        const indice = (y * largura + x) * 4;
        resultado[indice] = resultado[indice + 1] = resultado[indice + 2] = mediana;
      }
    }
    return new ImageData(resultado, largura, altura);
  };

  // Gradiente de Sobel
  const gradienteSobel = (dadosImg) => {
    const mascaraX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const mascaraY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const dados = dadosImg.data;
    const resultado = new Uint8ClampedArray(dados);
    
    for (let y = 1; y < altura - 1; y++) {
      for (let x = 1; x < largura - 1; x++) {
        let somaX = 0, somaY = 0;
        
        for (let my = -1; my <= 1; my++) {
          for (let mx = -1; mx <= 1; mx++) {
            const pixel = dados[((y + my) * largura + (x + mx)) * 4];
            somaX += pixel * mascaraX[my + 1][mx + 1];
            somaY += pixel * mascaraY[my + 1][mx + 1];
          }
        }
        
        const magnitude = Math.sqrt(somaX * somaX + somaY * somaY);
        const indice = (y * largura + x) * 4;
        resultado[indice] = resultado[indice + 1] = resultado[indice + 2] = Math.min(255, magnitude);
      }
    }
    return new ImageData(resultado, largura, altura);
  };

  // Aguçamento de Bordas
  const agucamento = (dadosImg) => {
    const mascara = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];
    return convolucao(dadosImg, mascara);
  };

  // High Boost
  const highBoost = (dadosImg, fatorK) => {
    const borrada = filtroMedia(dadosImg, 3);
    const largura = dadosImg.width;
    const altura = dadosImg.height;
    const resultado = new Uint8ClampedArray(dadosImg.data);
    
    for (let i = 0; i < resultado.length; i += 4) {
      const valor = fatorK * dadosImg.data[i] - borrada.data[i];
      resultado[i] = resultado[i + 1] = resultado[i + 2] = Math.min(255, Math.max(0, valor));
    }
    return new ImageData(resultado, largura, altura);
  };

  // Processa a operação selecionada
  const processarImagem = () => {
    if (!dadosImagem) return;

    let resultado;
    switch (operacaoSelecionada) {
      case 'negativo':
        resultado = negativo(dadosImagem);
        break;
      case 'limiarizacao':
        resultado = liarizacao(dadosImagem, parametros.limiar || 128);
        break;
      case 'gama':
        resultado = transformacaoPotencia(dadosImagem, parametros.gama || 1);
        break;
      case 'logaritmica':
        resultado = transformacaoLogaritmica(dadosImagem, parametros.c || 1);
        break;
      case 'expansaoHistograma':
        resultado = expansaoHistograma(dadosImagem);
        break;
      case 'equalizacaoHistograma':
        resultado = equalizacaoHistograma(dadosImagem);
        break;
      case 'contrasteAdaptativo':
        resultado = contrasteAdaptativo(dadosImagem, parametros.n || 3, parametros.c || 0.5);
        break;
      case 'escala':
        resultado = mudancaEscala(dadosImagem, parametros.escalaX || 1, parametros.escalaY || 1);
        break;
      case 'rotacao':
        resultado = rotacao(dadosImagem, parametros.angulo || 0);
        break;
      case 'cisalhamento':
        resultado = cisalhamento(dadosImagem, parametros.cisalhaX || 0, parametros.cisalhaY || 0);
        break;
      case 'rebatimentoH':
        resultado = rebatimento(dadosImagem, true);
        break;
      case 'rebatimentoV':
        resultado = rebatimento(dadosImagem, false);
        break;
      case 'filtroMedia':
        resultado = filtroMedia(dadosImagem, parametros.tamanho || 3);
        break;
      case 'filtroMediana':
        resultado = filtroMediana(dadosImagem, parametros.tamanho || 3);
        break;
      case 'sobel':
        resultado = gradienteSobel(dadosImagem);
        break;
      case 'agucamento':
        resultado = agucamento(dadosImagem);
        break;
      case 'highBoost':
        resultado = highBoost(dadosImagem, parametros.fatorK || 1.5);
        break;
      case 'filtroAgucamento':
        const c = parametros.c || 1;
        const d = parametros.d || 1;
        const mascara = [[-c, -c, -c], [-c, 8*c + d, -c], [-c, -c, -c]];
        resultado = convolucao(dadosImagem, mascara);
        break;
      case 'filtroRelevo':
        const mascaraRelevo = [[0, 0, 2], [0, -1, 0], [-1, 0, 0]];
        resultado = convolucao(dadosImagem, mascaraRelevo, 128);
        break;
      case 'filtroDeteccaoBordas':
        const mascaraBordas = [[-1, -1, 0], [0, -4, -1], [0, -1, 0]];
        resultado = convolucao(dadosImagem, mascaraBordas, 128);
        break;
      case 'alargamentoContraste':
        resultado = alargamentoContraste(dadosImagem, 
          parametros.r1 || 50, parametros.s1 || 0, 
          parametros.r2 || 200, parametros.s2 || 255);
        break;
      default:
        return;
    }

    const canvas = canvasResultadoRef.current;
    canvas.width = resultado.width;
    canvas.height = resultado.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(resultado, 0, 0);
    setImagemProcessada(canvas.toDataURL());
  };

  useEffect(() => {
    if (operacaoSelecionada) {
      processarImagem();
    }
  }, [operacaoSelecionada, parametros]);

  const baixarImagem = () => {
    if (!imagemProcessada) return;
    const link = document.createElement('a');
    link.download = 'imagem-processada.png';
    link.href = imagemProcessada;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ImageIcon className="w-8 h-8" />
            Sistema de Processamento de Imagens Grayscale
          </h1>
          <p className="text-purple-200">UNIR - Processamento de Imagens 2025</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Carregar Imagem
              </h2>
              <input
                ref={inputArquivoRef}
                type="file"
                accept="image/*"
                onChange={carregarImagem}
                className="hidden"
              />
              <button
                onClick={() => inputArquivoRef.current.click()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Selecionar Imagem
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Operações
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-white font-medium mb-2 block">Transformação de Intensidade</label>
                  <select
                    value={operacaoSelecionada}
                    onChange={(e) => setOperacaoSelecionada(e.target.value)}
                    className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
                  >
                    <option value="">Selecione...</option>
                    <option value="negativo">Negativo</option>
                    <option value="alargamentoContraste">Alargamento de Contraste</option>
                    <option value="limiarizacao">Limiarização</option>
                    <option value="gama">Transformação de Potência (Gamma)</option>
                    <option value="logaritmica">Transformação Logarítmica</option>
                  </select>
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Histograma</label>
                  <select
                    value={operacaoSelecionada}
                    onChange={(e) => setOperacaoSelecionada(e.target.value)}
                    className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
                  >
                    <option value="">Selecione...</option>
                    <option value="expansaoHistograma">Expansão de Histograma</option>
                    <option value="equalizacaoHistograma">Equalização de Histograma</option>
                    <option value="contrasteAdaptativo">Contraste Adaptativo</option>
                  </select>
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Transformações Geométricas</label>
                  <select
                    value={operacaoSelecionada}
                    onChange={(e) => setOperacaoSelecionada(e.target.value)}
                    className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
                  >
                    <option value="">Selecione...</option>
                    <option value="escala">Mudança de Escala</option>
                    <option value="rotacao">Rotação</option>
                    <option value="cisalhamento">Cisalhamento</option>
                    <option value="rebatimentoH">Rebatimento Horizontal</option>
                    <option value="rebatimentoV">Rebatimento Vertical</option>
                  </select>
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Filtragem</label>
                  <select
                    value={operacaoSelecionada}
                    onChange={(e) => setOperacaoSelecionada(e.target.value)}
                    className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
                  >
                    <option value="">Selecione...</option>
                    <option value="filtroMedia">Filtro de Média</option>
                    <option value="filtroMediana">Filtro de Mediana</option>
                    <option value="sobel">Gradiente de Sobel</option>
                    <option value="agucamento">Aguçamento</option>
                    <option value="highBoost">High Boost</option>
                  </select>
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Filtros Especiais</label>
                  <select
                    value={operacaoSelecionada}
                    onChange={(e) => setOperacaoSelecionada(e.target.value)}
                    className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
                  >
                    <option value="">Selecione...</option>
                    <option value="filtroAgucamento">Filtro de Aguçamento (c,d)</option>
                    <option value="filtroRelevo">Filtro de Relevo</option>
                    <option value="filtroDeteccaoBordas">Detecção de Bordas</option>
                  </select>
                </div>

                {operacaoSelecionada && (
                  <div className="bg-white/20 rounded-lg p-4 space-y-3">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <Sliders className="w-4 h-4" />
                      Parâmetros
                    </h3>
                    
                    {operacaoSelecionada === 'limiarizacao' && (
                      <div>
                        <label className="text-white text-sm">Limiar (0-255)</label>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={parametros.limiar || 128}
                          onChange={(e) => setParametros({...parametros, limiar: parseInt(e.target.value)})}
                          className="w-full"
                        />
                        <span className="text-white text-sm">{parametros.limiar || 128}</span>
                      </div>
                    )}
                    
                    {operacaoSelecionada === 'gama' && (
                      <div>
                        <label className="text-white text-sm">Gama (0.1-5.0)</label>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={parametros.gama || 1}
                          onChange={(e) => setParametros({...parametros, gama: parseFloat(e.target.value)})}
                          className="w-full"
                        />
                        <span className="text-white text-sm">{parametros.gama || 1}</span>
                      </div>
                    )}
                    
                    {operacaoSelecionada === 'logaritmica' && (
                      <div>
                        <label className="text-white text-sm">Constante c (0.1-5.0)</label>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={parametros.c || 1}
                          onChange={(e) => setParametros({...parametros, c: parseFloat(e.target.value)})}
                          className="w-full"
                        />
                        <span className="text-white text-sm">{parametros.c || 1}</span>
                      </div>
                    )}
                    
                    {operacaoSelecionada === 'contrasteAdaptativo' && (
                      <>
                        <div>
                          <label className="text-white text-sm">Tamanho da Vizinhança n (3-15)</label>
                          <input
                            type="range"
                            min="3"
                            max="15"
                            step="2"
                            value={parametros.n || 3}
                            onChange={(e) => setParametros({...parametros, n: parseInt(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.n || 3}x{parametros.n || 3}</span>
                        </div>
                        <div>
                          <label className="text-white text-sm">Constante c (0-2)</label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={parametros.c || 0.5}
                            onChange={(e) => setParametros({...parametros, c: parseFloat(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.c || 0.5}</span>
                        </div>
                      </>
                    )}
                    
                    {operacaoSelecionada === 'escala' && (
                      <>
                        <div>
                          <label className="text-white text-sm">Escala X (0.1-3.0)</label>
                          <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={parametros.escalaX || 1}
                            onChange={(e) => setParametros({...parametros, escalaX: parseFloat(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.escalaX || 1}</span>
                        </div>
                        <div>
                          <label className="text-white text-sm">Escala Y (0.1-3.0)</label>
                          <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={parametros.escalaY || 1}
                            onChange={(e) => setParametros({...parametros, escalaY: parseFloat(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.escalaY || 1}</span>
                        </div>
                      </>
                    )}
                    
                    {operacaoSelecionada === 'rotacao' && (
                      <div>
                        <label className="text-white text-sm">Ângulo (0-360°)</label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={parametros.angulo || 0}
                          onChange={(e) => setParametros({...parametros, angulo: parseInt(e.target.value)})}
                          className="w-full"
                        />
                        <span className="text-white text-sm">{parametros.angulo || 0}°</span>
                      </div>
                    )}
                    
                    {operacaoSelecionada === 'cisalhamento' && (
                      <>
                        <div>
                          <label className="text-white text-sm">Cisalhamento X (-1 a 1)</label>
                          <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.1"
                            value={parametros.cisalhaX || 0}
                            onChange={(e) => setParametros({...parametros, cisalhaX: parseFloat(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.cisalhaX || 0}</span>
                        </div>
                        <div>
                          <label className="text-white text-sm">Cisalhamento Y (-1 a 1)</label>
                          <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.1"
                            value={parametros.cisalhaY || 0}
                            onChange={(e) => setParametros({...parametros, cisalhaY: parseFloat(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.cisalhaY || 0}</span>
                        </div>
                      </>
                    )}
                    
                    {(operacaoSelecionada === 'filtroMedia' || operacaoSelecionada === 'filtroMediana') && (
                      <div>
                        <label className="text-white text-sm">Tamanho do Filtro (3-11)</label>
                        <input
                          type="range"
                          min="3"
                          max="11"
                          step="2"
                          value={parametros.tamanho || 3}
                          onChange={(e) => setParametros({...parametros, tamanho: parseInt(e.target.value)})}
                          className="w-full"
                        />
                        <span className="text-white text-sm">{parametros.tamanho || 3}x{parametros.tamanho || 3}</span>
                      </div>
                    )}
                    
                    {operacaoSelecionada === 'highBoost' && (
                      <div>
                        <label className="text-white text-sm">Fator k (1.0-5.0)</label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="0.1"
                          value={parametros.fatorK || 1.5}
                          onChange={(e) => setParametros({...parametros, fatorK: parseFloat(e.target.value)})}
                          className="w-full"
                        />
                        <span className="text-white text-sm">{parametros.fatorK || 1.5}</span>
                      </div>
                    )}
                    
                    {operacaoSelecionada === 'filtroAgucamento' && (
                      <>
                        <div>
                          <label className="text-white text-sm">Parâmetro c (1-10)</label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={parametros.c || 1}
                            onChange={(e) => setParametros({...parametros, c: parseInt(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.c || 1}</span>
                        </div>
                        <div>
                          <label className="text-white text-sm">Parâmetro d (1-10)</label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={parametros.d || 1}
                            onChange={(e) => setParametros({...parametros, d: parseInt(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.d || 1}</span>
                        </div>
                      </>
                    )}
                    
                    {operacaoSelecionada === 'alargamentoContraste' && (
                      <>
                        <div>
                          <label className="text-white text-sm">r1 (0-255)</label>
                          <input
                            type="range"
                            min="0"
                            max="255"
                            value={parametros.r1 || 50}
                            onChange={(e) => setParametros({...parametros, r1: parseInt(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.r1 || 50}</span>
                        </div>
                        <div>
                          <label className="text-white text-sm">s1 (0-255)</label>
                          <input
                            type="range"
                            min="0"
                            max="255"
                            value={parametros.s1 || 0}
                            onChange={(e) => setParametros({...parametros, s1: parseInt(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.s1 || 0}</span>
                        </div>
                        <div>
                          <label className="text-white text-sm">r2 (0-255)</label>
                          <input
                            type="range"
                            min="0"
                            max="255"
                            value={parametros.r2 || 200}
                            onChange={(e) => setParametros({...parametros, r2: parseInt(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.r2 || 200}</span>
                        </div>
                        <div>
                          <label className="text-white text-sm">s2 (0-255)</label>
                          <input
                            type="range"
                            min="0"
                            max="255"
                            value={parametros.s2 || 255}
                            onChange={(e) => setParametros({...parametros, s2: parseInt(e.target.value)})}
                            className="w-full"
                          />
                          <span className="text-white text-sm">{parametros.s2 || 255}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Imagem Original</h2>
              <div className="bg-black/30 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                {imagemOriginal ? (
                  <img src={imagemOriginal} alt="Original" className="max-w-full max-h-[400px] rounded" />
                ) : (
                  <p className="text-white/50">Nenhuma imagem carregada</p>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Imagem Processada</h2>
                {imagemProcessada && (
                  <button
                    onClick={baixarImagem}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </button>
                )}
              </div>
              <div className="bg-black/30 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                {imagemProcessada ? (
                  <img src={imagemProcessada} alt="Processada" className="max-w-full max-h-[400px] rounded" />
                ) : (
                  <p className="text-white/50">Selecione uma operação para processar</p>
                )}
              </div>
              <canvas ref={canvasResultadoRef} className="hidden" />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Informações</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Operações Implementadas</h3>
              <ul className="text-sm space-y-1 text-purple-200">
                <li>✓ Transformações de Intensidade</li>
                <li>✓ Equalização de Histograma</li>
                <li>✓ Contraste Adaptativo</li>
                <li>✓ Transformações Geométricas</li>
                <li>✓ Filtragem Linear e Não-Linear</li>
                <li>✓ Detecção e Aguçamento de Bordas</li>
                <li>✓ Convolução Genérica</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Recursos</h3>
              <ul className="text-sm space-y-1 text-purple-200">
                <li>✓ Interface Web Responsiva</li>
                <li>✓ Processamento em Tempo Real</li>
                <li>✓ Conversão Automática para Grayscale</li>
                <li>✓ Interpolação Bilinear</li>
                <li>✓ Download de Resultados</li>
                <li>✓ Controle de Parâmetros Interativo</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Tecnologias</h3>
              <ul className="text-sm space-y-1 text-purple-200">
                <li>✓ React + Hooks</li>
                <li>✓ Canvas API</li>
                <li>✓ Tailwind CSS</li>
                <li>✓ Lucide Icons</li>
                <li>✓ Processamento Client-Side</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SistemaProcessamentoImagens;