/* Carrega API Google Charts */
google.charts.load('current', {
    'packages':['corechart','table','bar']
});

function getArrayIntervaloData() {
    let dataInicial = document.getElementById("data-inicial").value;
    let dataFinal = document.getElementById("data-final").value;
    if(Date.parse(dataInicial) > Date.parse(dataFinal)) {
        alert("Erro, datas incorretas.");
        process.exit(1);
    }
    return [dataInicial, dataFinal];
}

function getMoedasSelecionadas() {
    var mapaMoedas = new Map();
    let nomeMoedas = ["USD", "EUR", "GBP"];
    let moedasChecklist = document.getElementsByClassName("moedas");
    //preenche mapa com booleano para gerar os gráficos das moedas selecionadas
    for(let i = 0; moedasChecklist[i]; i++) {
        if(moedasChecklist[i].checked) {
            mapaMoedas.set(nomeMoedas[i], true);
        } else {
            mapaMoedas.set(nomeMoedas[i], false);
        }
    }
    //verificação de valores do mapa no console
    mapaMoedas.forEach(function test (value, key) { console.log(key, value); })
    return mapaMoedas;
}

function formataDataUrl(intervaloData) {
    let dataInicio = intervaloData[0].split("-");
    let dataFim = intervaloData[1].split("-");
    let dataInicioFormatada = dataInicio[1] + "-" + dataInicio[2] + "-" + dataInicio[0];
    let dataFimFormatada = dataFim[1] + "-" + dataFim[2] + "-" + dataFim[0];
    return [dataInicioFormatada, dataFimFormatada];
}

/* Monta chamada para API de Cotação de Moeda */
function montaUrl(intervaloData, nomeMoeda) {
    let datasFormatadas = formataDataUrl(intervaloData);
    return "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='" + 
    nomeMoeda + "'&@dataInicial='" + datasFormatadas[0] + "'&@dataFinalCotacao='" + datasFormatadas[1] + "'&$top=10000&$skip=0&$format=json&$select=cotacaoVenda,dataHoraCotacao,tipoBoletim";
}

/* Pega a data do json e cria objeto "data" */
function toDate(dataHoraCotacao) {
    console.log(dataHoraCotacao);
    let aux = dataHoraCotacao.split(' ');
    let data = aux[0].split("-");
    return new Date(data[0] + '/' + data[1] + '/'+ data[2]);
}


function limpaGraficoExistente(nomeMoeda) {
    if(document.contains(document.getElementById(nomeMoeda)))
        document.getElementById("graficos").removeChild(document.getElementById(nomeMoeda));
}

/* Verifica se saída será em forma de "Gráfico" ou "Tabela" */
function getFormatoSaida(){
    let formatoSaida = document.getElementsByName("formato-saida");

    for(i = 0; i < formatoSaida.length; i++){
        if(formatoSaida[i].checked) 
            return formatoSaida[i].value    
    }
    
}

/* Gera saída de dados em "Gráfico" ou "Tabela" */
function geraGraficos() {
    //devolve array com data inicial e data final
    let intervaloData = getArrayIntervaloData();
    //devolve mapa com as moedas selecionadas
    let moedasSelecionadas = getMoedasSelecionadas();
    let formatoSaida = getFormatoSaida();

    //itera pelo mapa, só gera o gráfico se a moeda estiver selecionada
    //mapa -> [nome da moeda, esta selecionada ou não]
    for (const [nomeMoeda, isSelecionada] of moedasSelecionadas.entries()) {
        limpaGraficoExistente(nomeMoeda);
        if(isSelecionada) {
            let divGrafico = document.createElement("div");
            divGrafico.id = nomeMoeda;
            document.getElementById("graficos").appendChild(divGrafico);

            //Gera GRÁFICO
            if(formatoSaida == 'GRAPH'){
                let dados = [["Data", "Paridade com o real"]]

                let chart = new google.visualization.LineChart(divGrafico);
                let options = {
                    title: nomeMoeda,
                    legend: { position: "bottom" }
                };
    
                //Request
                let request = new XMLHttpRequest();
                console.log("Gerando gráfico", nomeMoeda);
                let url = montaUrl(intervaloData, nomeMoeda);
                request.open('GET', url);
                request.responsetype = 'json';
                request.send();
                request.onload = function() {
                    let dadosJson = JSON.parse(request.response);
                    //preenche dadosJson com os dados da requisição  <=== Corrigir para pegar "tipoBoletim == 'Fechamento'"
                    for(let i = 0; i < dadosJson.value.length; i += 5) {
                        dados.push( [
                        toDate(dadosJson.value[i].dataHoraCotacao),
                        dadosJson.value[i].cotacaoVenda
                        ]);
                    }
                    
                    var dadosGC = google.visualization.arrayToDataTable(dados);
                    chart.draw(dadosGC, options);
                }
            }
            //Gera TABELA
            else if(formatoSaida == 'TABLE'){
                let dados = [];
                let dadosJson = {};
                let data = new google.visualization.DataTable();
                let options = {
                    title: nomeMoeda,
                    showRowNumber: true, width: '100%', height: '100%'
                };

                let request = new XMLHttpRequest();
                let url = montaUrl(intervaloData, nomeMoeda);
                request.open('GET', url);
                request.responsetype = 'json';
                request.send();
                request.onload = function() {
                    dadosJson = JSON.parse(request.response);
                    //preenche dadosJson com os dados da requisição
                    for(let i = 0; i < dadosJson.value.length; i +=5) {
                            dados.push( [
                            toDate(dadosJson.value[i].dataHoraCotacao),
                            dadosJson.value[i].cotacaoVenda
                            ]);
                    }

                    data.addColumn('number', nomeMoeda);
                    data.addColumn('string', 'Data hora cotação');
                    for(i = 0; i < dadosJson.value.length; i+=5){
                        data.addRows([
                            [dadosJson.value[i].cotacaoVenda, dadosJson.value[i].dataHoraCotacao]
                        ]);
                    }

                    let table = new google.visualization.Table(document.getElementById(divGrafico.id));
                    table.draw(data, options);
                    
                }
    
                
            }
           
        }
    }
    //limpar gráficos qnd for fazer nova request
}

function setup() {
    let data = new Date();
    //coloca valores padrão no input do intervalo da data
    document.getElementById("data-inicial").value = "2021-01-02";
    document.getElementById("data-final").value = data.toJSON().slice(0,10);
}
