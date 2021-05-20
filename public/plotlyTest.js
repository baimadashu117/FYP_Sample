import * as jQuery from '../jquery/dist/jquery.js';
import { fn } from './csvTest.js';


let plot = (callback) => {

  let a;
  let indexMap = new Map();

  fn((data, html) => {
    a = data;
    for (var i = 0; i < data[0].length; i++) {
      indexMap[data[0][i]] = i;
    }
    // console.log(data);
    // console.log(indexMap);
    callback(draw);
  })

  function draw(category) {
    console.log(indexMap);
    console.log(category);
    var temp = []
    for (var i = 1; i < a.length - 1; i++) {
      temp[i] = parseFloat(a[i][indexMap[category]]);
    }
    console.log(temp);
    var max = temp[1];
    var min = temp[1];
    for (let i = 0; i < temp.length; i++) {
      if (temp[i] > max) {
        max = temp[i];
      }
      if (temp[i] < min) {
        min = temp[i];
      }
    }
    console.log(max + " " + min);
    var bin_size = (max-min)/10;
    var trace = {
      x: temp,
      type: 'histogram',
      autobinx: false,
      xbins: {
        start: min,
        size: bin_size,
        end: max
      }
    };
    var layout = {
      xaxis: { title: "Value" },
      yaxis: { title: "Count" },
      title: category
    }
    var data = [trace];
    Plotly.newPlot('plotly_panel', data, layout);
  }
}

export { plot };
