//Desarrollo de las visualizaciones
import * as d3 from 'd3';
import { numberWithCommas3 } from '../helpers';
import { getInTooltip, getOutTooltip, positionTooltip } from '../modules/tooltip';
import { setChartHeight } from '../modules/height';
import { setChartCanvas, setChartCanvasImage } from '../modules/canvas-image';
import { setRRSSLinks } from '../modules/rrss';
import { setFixedIframeUrl } from './chart_helpers';

//Colores fijos
const COLOR_PRIMARY_1 = '#F8B05C';
let tooltip = d3.select('#tooltip');

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

        ///valores iniciales de altura, anchura y márgenes
        let margin = {top: 10, right: 25, bottom: 20, left: 70},
            width = document.getElementById('chart').clientWidth - margin.left - margin.right,
            height = width * 0.67 - margin.top - margin.bottom;

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

        let xAxis = function(svg) {
            svg.call(d3.axisBottom(x).ticks(6).tickFormat(function(d) { return numberWithCommas3(Math.abs(d)); }));
            svg.call(function(g){
                g.selectAll('.tick line')
                    .attr('class', function(d,i) {
                        if (d == 0) {
                            return 'line-special';
                        }
                    })
                    .attr('y1', '0')
                    .attr('y2', `-${height}`)
            });
        }

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        let y = d3.scaleBand()
                .range([ 0, height ])
                .domain(data.map(function(item) { return item.edades; }).reverse())
                .padding(.1);

            let yAxis = function(svg) {
                svg.call(d3.axisLeft(y).tickValues(y.domain().filter(function(d,i){ return !(i%10)})));
                svg.call(function(g){g.selectAll('.tick line').remove()});
            }
    
            svg.append("g")
                .call(yAxis);

        function initPyramid(year) {
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
                .attr("fill", COLOR_PRIMARY_1)
                .attr("x", x(0))
                .attr("y", function(d) { return y(d.edades); })
                .attr("width", 0)
                .attr("height", y.bandwidth())
                .on('mouseover', function(d,i,e) {
                    //Dibujo contorno de la rect
                    this.style.stroke = '#000';
                    this.style.strokeWidth = '1';

                    //Texto en tooltip
                    let html = '<p class="chart__tooltip--title">' + d.sexo + ' con ' + d.edades + ' años en ' + d.Periodo + '</p>' + 
                        '<p class="chart__tooltip--text">Número absoluto de personas: ' + numberWithCommas3(parseInt(d.valor))+ '</p>';
                
                    tooltip.html(html);

                    //Tooltip
                    positionTooltip(window.event, tooltip);
                    getInTooltip(tooltip);
                })
                .on('mouseout', function(d,i,e) {
                    //Fuera contorno
                    this.style.stroke = 'none';
                    this.style.strokeWidth = '0';

                    //Fuera tooltip
                    getOutTooltip(tooltip);
                })
                .transition()
                .duration(2000)
                .attr("x", function(d) { if(d.sexo == 'Hombres') { return xM(d.valor); } else { return xF(0); }})
                .attr('width', function(d) { if(d.sexo == 'Hombres') { return xM(0) - xM(d.valor); } else { return xF(d.valor) - xF(0); }});

        }

        function updatePyramid(year) {
            let currentData = data.filter( function(item) {
                if (year == parseInt(item.Periodo)) {
                    return item;
                }
            });
            
            svg.selectAll('.prueba')
                .data(currentData)
                .transition()
                .duration(500)
                .attr("x", function(d) { if(d.sexo == 'Hombres') { return xM(d.valor); } else { return xF(0); }})
                .attr("y", function(d) { return y(d.edades); })
                .attr("width", function(d) { if(d.sexo == 'Hombres') { return xM(0) - xM(d.valor); } else { return xF(d.valor) - xF(0); }});
        }

        function animatePyramid(year) {
            //Como si parasemos el slider
            clearInterval(sliderInterval);
            playButton.style.display = 'inline-block';
            pauseButton.style.display = 'none';

            //Desarrollamos la animación
            let currentData = data.filter( function(item) {
                if (year == parseInt(item.Periodo)) {
                    return item;
                }
            });
            
            svg.selectAll('.prueba')
                .data(currentData)
                .attr("x", x(0))
                .attr("y", function(d) { return y(d.edades); })
                .attr("width", 0)
                .attr("height", y.bandwidth())
                .on('mouseover', function(d,i,e) {
                    //Dibujo contorno de la rect
                    this.style.stroke = '#000';
                    this.style.strokeWidth = '1';

                    //Texto en tooltip
                    let html = '<p class="chart__tooltip--title">' + d.sexo + ' con ' + d.edades + ' años en ' + d.Periodo + '</p>' + 
                        '<p class="chart__tooltip--text">Número absoluto de personas: ' + numberWithCommas3(parseInt(d.valor))+ '</p>';
                
                    tooltip.html(html);

                    //Tooltip
                    positionTooltip(window.event, tooltip);
                    getInTooltip(tooltip);
                })
                .on('mouseout', function(d,i,e) {
                    //Fuera contorno
                    this.style.stroke = 'none';
                    this.style.strokeWidth = '0';

                    //Fuera tooltip
                    getOutTooltip(tooltip);
                })
                .transition()
                .duration(2000)
                .attr("x", function(d) { if(d.sexo == 'Hombres') { return xM(d.valor); } else { return xF(0); }})
                .attr('width', function(d) { if(d.sexo == 'Hombres') { return xM(0) - xM(d.valor); } else { return xF(d.valor) - xF(0); }});
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
            animatePyramid(currentValue);
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

        let pngDownload = document.getElementById('pngImage');

        pngDownload.addEventListener('click', function(){
            setChartCanvasImage('proyecciones_sexo_edad');
        });

        //Altura del frame
        setChartHeight(iframe);
    });    
}