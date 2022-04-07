//Desarrollo de las visualizaciones
import * as d3 from 'd3';
//import { numberWithCommas2 } from './helpers';
//import { getInTooltip, getOutTooltip, positionTooltip } from './modules/tooltip';
import { setChartHeight } from '../modules/height';
import { setChartCanvas, setChartCanvasImage, setCustomCanvas, setChartCustomCanvasImage } from '../modules/canvas-image';
import { setRRSSLinks } from '../modules/rrss';
import { setFixedIframeUrl } from './chart_helpers';

//Colores fijos
const COLOR_PRIMARY_1 = '#F8B05C', 
COLOR_PRIMARY_2 = '#E37A42', 
COLOR_ANAG_1 = '#D1834F', 
COLOR_ANAG_2 = '#BF2727', 
COLOR_COMP_1 = '#528FAD', 
COLOR_COMP_2 = '#AADCE0', 
COLOR_GREY_1 = '#B5ABA4', 
COLOR_GREY_2 = '#64605A', 
COLOR_OTHER_1 = '#B58753', 
COLOR_OTHER_2 = '#731854';

export function initChart(iframe) {
    //Creación de otros elementos relativos al gráfico que no requieran lectura previa de datos > Selectores múltiples o simples, timelines, etc 

    //Lectura de datos
    d3.csv('https://raw.githubusercontent.com/CarlosMunozDiazCSIC/informe_perfil_mayores_2022_demografia_1_3/main/data/evolucion_poblacion_1908_2035_v2.csv', function(error,data) {
        if (error) throw error;

        ////////
        //////
        // LÓGICA DEL SLIDER
        //////
        ///////
        let currentValue = 2021;
        const firstValue = 1908;
        const lastValue = 2035;

        let sliderRange = document.getElementById('slider');
        let sliderDate = document.getElementById('sliderDate');
        let playButton = document.getElementById('btnPlay');
        let pauseButton = document.getElementById('btnPause');
        let sliderInterval;

        function createTimeslider(){        
            /* Los siguientes eventos tienen la capacidad de modificar lo que se muestra en el mapa */
            playButton.onclick = function () {
                sliderInterval = setInterval(setNewValue,1000);
                playButton.style.display = 'none';
                pauseButton.style.display = 'inline-block';    
            }
        
            pauseButton.onclick = function () {
                clearInterval(sliderInterval);
                playButton.style.display = 'inline-block';
                pauseButton.style.display = 'none';
            }
        
            sliderRange.oninput = function () {
                sliderDate.innerHTML = this.value;
                setNewValue('input');                
            }
        }
        
        /* Da nuevos valores al slider */
        function setNewValue(type = undefined) {
            let value = parseInt(sliderRange.value);
            if (value == lastValue && !type) {
                sliderRange.value = firstValue;
            } else if (value == firstValue && type) {
                sliderRange.value = value;
            } else {
                sliderRange.value = value + 1;
            }
            currentValue = sliderRange.value;
            sliderDate.innerHTML = currentValue;
        
            updatePyramid(currentValue);
        
            if (currentValue == 2035) {
                clearInterval(sliderInterval);
                playButton.style.display = 'inline-block';
                pauseButton.style.display = 'none';
            }
        }

        /////
        /////
        // LÓGICA DE LA PIRÁMIDE
        /////
        /////

        ///Valores iniciales de altura, anchura y márgenes
        let margin = {top: 20, right: 30, bottom: 40, left: 90},
            width = document.getElementById('chart').clientWidth - margin.left - margin.right,
            height = document.getElementById('chart').clientHeight - margin.top - margin.bottom;

        let svg = d3.select("#chart")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let x = d3.scaleLinear()
            .domain([-600000,600000])
            .range([0,width]);

        let xM = d3.scaleLinear()
            .domain([600000,0])
            .range([0, width / 2]);

        let xF = d3.scaleLinear()
            .domain([0,600000])
            .range([width / 2, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        let y = d3.scaleBand()
                .range([ 0, height ])
                .domain(d3.range(101).reverse())
                .padding(.1);

        svg.append("g")
            .call(d3.axisLeft(y));

        function initPyramid(year) { //2021
            let currentData = data.filter( function(item) {
                if (year == parseInt(item.Periodo)) {
                    return item;
                }
            });

            svg.append("g")
                .selectAll("rect")
                .data(currentData)
                .enter()
                .append("rect")
                .attr('class', 'prueba')
                .attr("fill", function(d) { if(d.sexo == 'Hombres') { return COLOR_PRIMARY_1; } else { return COLOR_COMP_1; }})
                .attr("x", function(d) { if(d.sexo == 'Hombres') { return xM(d.valor); } else { return xF(0); }})
                .attr("y", function(d) { return y(d.edades); })
                .attr("width", function(d) { if(d.sexo == 'Hombres') { return xM(0) - xM(d.valor); } else { return xF(d.valor) - xF(0); }})
                .attr("height", y.bandwidth());

        }

        function updatePyramid(year) {
            let currentData = data.filter( function(item) {
                if (year == parseInt(item.Periodo)) {
                    return item;
                }
            });
            
            svg
                .selectAll('.prueba')
                .data(currentData)
                .transition()
                .duration(500)
                .attr("x", function(d) { if(d.sexo == 'Hombres') { return xM(d.valor); } else { return xF(0); }})
                .attr("y", function(d) { return y(d.edades); })
                .attr("width", function(d) { if(d.sexo == 'Hombres') { return xM(0) - xM(d.valor); } else { return xF(d.valor) - xF(0); }})

        }

        function animatePyramid() {
            //Como si parasemos el slider
            clearInterval(sliderInterval);
            playButton.style.display = 'inline-block';
            pauseButton.style.display = 'none';

            //Desarrollamos la animación
        }

        /////
        /////
        // Resto - Chart > Si dan click en el botón de animación, paramos el slider en la fecha en la que esté y animamos el gráfico en ese momento
        /////
        /////
        initPyramid(currentValue);
        createTimeslider();

        //Animación del gráfico
        document.getElementById('replay').addEventListener('click', function() {
            animatePyramid();
        });

        /////
        /////
        // Resto
        /////
        /////

        //Iframe
        setFixedIframeUrl('informe_perfil_mayores_2022_demografia_1_3','proyecciones_sexo_edad');

        //Redes sociales > Antes tenemos que indicar cuál sería el texto a enviar
        setRRSSLinks('proyecciones_sexo_edad');

        //Captura de pantalla de la visualización
        setChartCanvas();
        setCustomCanvas();

        let pngDownload = document.getElementById('pngImage');

        pngDownload.addEventListener('click', function(){
            setChartCanvasImage('proyecciones_sexo_edad');
            setChartCustomCanvasImage('proyecciones_sexo_edad');
        });

        //Altura del frame
        setChartHeight(iframe);
    });    
}