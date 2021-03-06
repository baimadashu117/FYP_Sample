import { fn } from './csvTest.js';

fn((data, html) => {
    console.log(data);

    /* When the user clicks on the button, 
    toggle between hiding and showing the dropdown content */
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

    let showDataBtn = document.querySelector('#showData');
    showDataBtn.onclick = function () { showData() };

    function showData() {
        console.log(data);
        var myWindow = window.open("", "_blank");
        myWindow.document.write(html);
    }

    let showModelBtn = document.querySelector('#showModel');
    showModelBtn.onclick = function () { showModel() };

    function showModel() {
        var myWindow = window.open("resources/iframe/new_terrain.html", "_blank");
    }

    let showTraceBtn = document.querySelector('#showTrace');
    showTraceBtn.onclick = function () { showTrace() }

    function showTrace() {
        var myWindow = window.open("resources/iframe/data_trace.html", "_blank");
    }

    let histogramBtn = document.querySelector('#histogram');
    histogramBtn.onclick = function () { showHistogram() };

    function showHistogram() {
        var myWindow = window.open("histogram.html", "_blank");
    }

})