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

    let depth = document.querySelector('#depth');
    depth.onclick = function () { showDepth() };

    function showDepth() {
        draw('depth');
    }

    let chlorophyll = document.querySelector('#chlorophyll');
    chlorophyll.onclick = function () { showChlorophyll() };

    function showChlorophyll() {
        draw('chlorophyll');
    }

    let temperature = document.querySelector('#temperature');
    temperature.onclick = function () { showTemperature() };

    function showTemperature() {
        draw('temperature');
    }

    let algalProtein = document.querySelector('#algalProtein');
    algalProtein.onclick = function () { showAlgalProtein() };

    function showAlgalProtein() {
        draw('algal_protein');
    }
})
