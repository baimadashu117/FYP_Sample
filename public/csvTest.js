import * as jQuery from '../jquery/dist/jquery.js';
import * as csv from '../jquery-csv/src/jquery.csv.js';

// $('#message').text('Hi from jQuery!');
let data;
let html;

let fn = (callback) => {
    $.ajax({
        type: "GET",
        url: "resources/xyz_data.csv",
        dataType: "text",
        success: function (response) {
            data = $.csv.toArrays(response);
            // console.log(data);
            html = generateHtmlTable(data);
            callback(data,html);
        }
    });
 }
 
 export { fn }

function generateHtmlTable(data) {
    var html = '<table  class="table table-condensed table-hover table-striped">';
    if (typeof (data[0]) === 'undefined') {
        return null;
    } else {
        $.each(data, function (index, row) {
            //bind header
            if (index == 0) {
                html += '<thead>';
                html += '<tr>';
                $.each(row, function (index, colData) {
                    html += '<th>';
                    html += colData;
                    html += '</th>';
                });
                html += '</tr>';
                html += '</thead>';
                html += '<tbody>';
            } else {
                html += '<tr>';
                $.each(row, function (index, colData) {
                    html += '<td>';
                    html += colData;
                    html += '</td>';
                });
                html += '</tr>';
            }
        });
        html += '</tbody>';
        html += '</table>';
        // $('#csv-display').append(html);
    }
    return html;
}
