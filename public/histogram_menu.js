import { plot } from './plotlyTest.js'


plot((draw) => {
    let dropButton = document.querySelector('.dropbtn');
    dropButton.onclick = function () { buttonFunction() };

    function buttonFunction() {
        document.getElementById("myDropdown").classList.toggle("show");
    }

    // Close the dropdown if the user clicks outside of it
    window.onclick = function (event) {
        if (!event.target.matches('.dropbtn')) {
            var dropdowns = document.getElementsByClassName("dropdown-content");
            var i;
            for (i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    }

    let chlorophyll = document.querySelector('#chlorophyll');
    chlorophyll.onclick = function () { showChlorophyll() };

    function showChlorophyll() {
        draw('chlorophyll');
    }

    let conductivity = document.querySelector('#conductivity');
    conductivity.onclick = function () { showConductivity() };

    function showConductivity() {
        draw('conductivity');
    }

    let salinity = document.querySelector('#salinity');
    salinity.onclick = function () { showSalinity() };

    function showSalinity() {
        draw('salinity');
    }

    let temperature = document.querySelector('#temperature');
    temperature.onclick = function () { showTemperature() };

    function showTemperature() {
        draw('temperature');
    }
})
