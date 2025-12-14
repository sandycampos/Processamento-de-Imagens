import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Download, ImageIcon, Info, Settings } from 'lucide-react';

const ProcessadorImagensBaixaLuminosidade = () => {
  const [imagem, setImagem] = useState(null);
  const [imagemProcessada, setImagemProcessada] = useState(null);
  const [metodo, setMetodo] = useState('proposto');
  const [processando, setProcessando] = useState(false);
  const [luminancia, setLuminancia] = useState(null);
  const [constanteC, setConstanteC] = useState(null);
  const [lambda, setLambda] = useState(0.7);
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  
  const canvasRef = useRef(null);
  const canvasOriginalRef = useRef(null);
  const inputArquivoRef = useRef(null);

  // Equação 1: Conversão RGB para escala de cinza (luminância)
  const rgbParaCinza = (r, g, b) => {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // Equação 2 e 3: Cálculo do histograma e histograma cumulativo
  const calcularHistograma = (dadosImagem) => {
    const histograma = new Array(256).fill(0);
    const total = dadosImagem.width * dadosImagem.height;

    for (let i = 0; i < dadosImagem.data.length; i += 4) {
      const cinza = Math.floor(rgbParaCinza(
        dadosImagem.data[i],
        dadosImagem.data[i + 1],
        dadosImagem.data[i + 2]
      ));
      histograma[cinza]++;
    }

    // Normalizar histograma
    const histogramaNormalizado = histograma.map(val => val / total);
    
    // Calcular histograma cumulativo
    const histogramaCumulativo = new Array(256);
    histogramaCumulativo[0] = histogramaNormalizado[0];
    for (let i = 1; i < 256; i++) {
      histogramaCumulativo[i] = histogramaCumulativo[i - 1] + histogramaNormalizado[i];
    }

    return { histograma: histogramaNormalizado, histogramaCumulativo };
  };

  // Equação 4 e 5: Estimação do nível de luminância
  const estimarLuminancia = (histogramaCumulativo) => {
    const s = lambda * histogramaCumulativo[255];
    
    // Encontrar z através da transformação inversa
    let z = 0;
    for (let i = 0; i < 256; i++) {
      if (histogramaCumulativo[i] >= s) {
        z = i;
        break;
      }
    }
    
    return z;
  };

  // Equação 8: Calcular ponto k
  const calcularK = (z) => {
    const L = 255;
    const eta = 127;
    return z < eta ? L - 2 * z : 1;
  };

  // Equação 9: Calcular constante c
  const calcularC = (k) => {
    const epsilon = 1;
    return k / Math.log(k + epsilon);
  };

  // Equação 10: Transformação logarítmica
  const transformacaoLog = (intensidade, c) => {
    const epsilon = 1;
    return c * Math.log(intensidade + epsilon);
  };

  // Equação 11: Método proposto
  const transformacaoProposta = (intensidade, k, c) => {
    if (intensidade <= k) {
      return transformacaoLog(intensidade, c);
    }
    return intensidade;
  };

  // Equação 6: Tone Mapping (Lee et al.)
  const mapeamentoTonal = (intensidade) => {
    const T1 = 105;
    const T2 = 150;
    const M = 255;
    
    if (intensidade <= T1) {
      return T2 * Math.pow(intensidade / T1, 2);
    }
    return T2 + (M - T2) * Math.pow((intensidade - T1) / (M - T1), 2);
  };

  // Transformação logarítmica tradicional
  const transformacaoLogTradicional = (intensidade) => {
    const epsilon = 1;
    const c = 255 / Math.log(256);
    return c * Math.log(intensidade + epsilon);
  };

  // Equalização de Histograma
  const equalizacaoHistograma = (intensidade, histogramaCumulativo) => {
    return Math.floor(histogramaCumulativo[Math.floor(intensidade)] * 255);
  };

  // Processar imagem
  const processarImagem = () => {
    if (!imagem) return;

    setProcessando(true);
    
    const canvas = canvasOriginalRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const dadosImagem = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { histogramaCumulativo } = calcularHistograma(dadosImagem);
      
      // Estimar luminância
      const z = estimarLuminancia(histogramaCumulativo);
      setLuminancia(z);
      
      // Calcular parâmetros
      const k = calcularK(z);
      const c = calcularC(k);
      setConstanteC(c);
      
      // Criar nova imagem processada
      const canvasProcessado = canvasRef.current;
      canvasProcessado.width = canvas.width;
      canvasProcessado.height = canvas.height;
      const ctxProcessado = canvasProcessado.getContext('2d');
      const dadosProcessados = ctx.createImageData(canvas.width, canvas.height);
      
      // Aplicar transformação
      for (let i = 0; i < dadosImagem.data.length; i += 4) {
        const r = dadosImagem.data[i];
        const g = dadosImagem.data[i + 1];
        const b = dadosImagem.data[i + 2];
        const a = dadosImagem.data[i + 3];
        
        let novoR, novoG, novoB;
        
        switch (metodo) {
          case 'proposto':
            novoR = Math.min(255, Math.max(0, transformacaoProposta(r, k, c)));
            novoG = Math.min(255, Math.max(0, transformacaoProposta(g, k, c)));
            novoB = Math.min(255, Math.max(0, transformacaoProposta(b, k, c)));
            break;
          
          case 'log':
            novoR = Math.min(255, Math.max(0, transformacaoLogTradicional(r)));
            novoG = Math.min(255, Math.max(0, transformacaoLogTradicional(g)));
            novoB = Math.min(255, Math.max(0, transformacaoLogTradicional(b)));
            break;
          
          case 'tonal':
            novoR = Math.min(255, Math.max(0, mapeamentoTonal(r)));
            novoG = Math.min(255, Math.max(0, mapeamentoTonal(g)));
            novoB = Math.min(255, Math.max(0, mapeamentoTonal(b)));
            break;
          
          case 'histograma':
            novoR = Math.min(255, Math.max(0, equalizacaoHistograma(r, histogramaCumulativo)));
            novoG = Math.min(255, Math.max(0, equalizacaoHistograma(g, histogramaCumulativo)));
            novoB = Math.min(255, Math.max(0, equalizacaoHistograma(b, histogramaCumulativo)));
            break;
          
          default:
            novoR = r;
            novoG = g;
            novoB = b;
        }
        
        dadosProcessados.data[i] = novoR;
        dadosProcessados.data[i + 1] = novoG;
        dadosProcessados.data[i + 2] = novoB;
        dadosProcessados.data[i + 3] = a;
      }
      
      ctxProcessado.putImageData(dadosProcessados, 0, 0);
      setImagemProcessada(canvasProcessado.toDataURL());
      setProcessando(false);
    };
    
    img.src = imagem;
  };

  useEffect(() => {
    if (imagem) {
      processarImagem();
    }
  }, [imagem, metodo, lambda]);

  const manipularUploadArquivo = (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const leitor = new FileReader();
      leitor.onload = (evento) => {
        setImagem(evento.target.result);
      };
      leitor.readAsDataURL(arquivo);
    }
  };

  const manipularDownload = () => {
    if (imagemProcessada) {
      const link = document.createElement('a');
      link.download = `processada_${metodo}_${Date.now()}.png`;
      link.href = imagemProcessada;
      link.click();
    }
  };

  const obterInfoConjunto = () => {
    if (luminancia === null) return null;
    
    if (luminancia <= 34) {
      return { 
        conjunto: 'Conjunto 1', 
        descricao: 'Imagem com regiões predominantemente escuras', 
        cor: 'text-blue-600' 
      };
    } else if (luminancia <= 69) {
      return { 
        conjunto: 'Conjunto 2', 
        descricao: 'Imagem com regiões mistas (escuras e claras)', 
        cor: 'text-yellow-600' 
      };
    } else {
      return { 
        conjunto: 'Conjunto 3', 
        descricao: 'Imagem com muitas regiões claras', 
        cor: 'text-green-600' 
      };
    }
  };

  const infoConjunto = obterInfoConjunto();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="w-full max-w-[1920px] mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Camera className="w-8 h-8" />
            Processamento Adaptativo de Imagens em Baixa Luminosidade
          </h1>
          <p className="text-gray-300">
            Baseado em Zahi & Yue (2017) - Computing Conference
          </p>
        </div>

        {/* Seção de Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload de Imagem
              </h2>
              
              <button
                onClick={() => inputArquivoRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mb-4"
              >
                <ImageIcon className="w-5 h-5" />
                Selecionar Imagem
              </button>
              
              <input
                ref={inputArquivoRef}
                type="file"
                accept="image/*"
                onChange={manipularUploadArquivo}
                className="hidden"
              />

              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-white font-medium mb-2 block">
                    Método de Transformação
                  </label>
                  <select
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value)}
                    className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2"
                  >
                    <option value="proposto" className="bg-gray-800">Método Proposto (Zahi & Yue)</option>
                    <option value="log" className="bg-gray-800">Transformação Logarítmica</option>
                    <option value="tonal" className="bg-gray-800">Mapeamento Tonal (Lee et al.)</option>
                    <option value="histograma" className="bg-gray-800">Equalização de Histograma</option>
                  </select>
                </div>

                <button
                  onClick={() => setMostrarAvancado(!mostrarAvancado)}
                  className="text-blue-300 hover:text-blue-200 flex items-center gap-2 text-sm"
                >
                  <Settings className="w-4 h-4" />
                  {mostrarAvancado ? 'Ocultar' : 'Mostrar'} Configurações Avançadas
                </button>

                {mostrarAvancado && (
                  <div>
                    <label className="text-white font-medium mb-2 block">
                      Lambda (λ) - Limiar de Luminância: {lambda.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="0.9"
                      step="0.05"
                      value={lambda}
                      onChange={(e) => setLambda(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Controla o percentil para estimação de luminância (padrão: 0.7)
                    </p>
                  </div>
                )}

                {luminancia !== null && (
                  <div className="bg-white/10 rounded-lg p-4 space-y-2">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Análise da Imagem
                    </h3>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-300">
                        <span className="font-medium">Luminância (z):</span> {luminancia.toFixed(2)}
                      </p>
                      <p className="text-gray-300">
                        <span className="font-medium">Constante (c):</span> {constanteC?.toFixed(2)}
                      </p>
                      {infoConjunto && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className={`font-semibold ${infoConjunto.cor}`}>
                            {infoConjunto.conjunto}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {infoConjunto.descricao}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Exibição de Imagens */}
          <div className="lg:col-span-3">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Resultado</h2>
                {imagemProcessada && (
                  <button
                    onClick={manipularDownload}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-medium mb-3 text-lg">Original</h3>
                  <div className="bg-black/30 rounded-lg overflow-hidden min-h-[500px] flex items-center justify-center">
                    {imagem ? (
                      <img src={imagem} alt="Original" className="w-full h-full object-contain" />
                    ) : (
                      <p className="text-gray-400 text-lg">Nenhuma imagem carregada</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-3 text-lg">Processada</h3>
                  <div className="bg-black/30 rounded-lg overflow-hidden min-h-[500px] flex items-center justify-center">
                    {processando ? (
                      <div className="text-white text-lg">Processando...</div>
                    ) : imagemProcessada ? (
                      <img src={imagemProcessada} alt="Processada" className="w-full h-full object-contain" />
                    ) : (
                      <p className="text-gray-400 text-lg">Aguardando processamento</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Informações */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Sobre o Algoritmo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300 text-sm">
            <div>
              <h3 className="font-semibold text-white mb-2">Método Proposto</h3>
              <p>Combina transformação logarítmica e identidade para melhorar regiões escuras preservando detalhes em regiões claras.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Adaptativo</h3>
              <p>Analisa a distribuição de intensidade da imagem para ajustar automaticamente os parâmetros de transformação.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Classificação</h3>
              <p>Conjunto 1 (z: 0-34): Escuro | Conjunto 2 (z: 35-69): Misto | Conjunto 3 (z: 70+): Claro</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Aplicações</h3>
              <p>Visão noturna, vigilância, navegação autônoma, rastreamento de objetos em condições de baixa luminosidade.</p>
            </div>
          </div>
        </div>

        {/* Canvas ocultos */}
        <canvas ref={canvasOriginalRef} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default ProcessadorImagensBaixaLuminosidade;