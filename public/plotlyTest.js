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
    console.log(data);
    console.log(indexMap);
    callback(draw);
  })

  function draw(category) {
    console.log(indexMap);
    console.log(category);
    var temp = []
    for (var i = 1; i < a.length - 1; i++) {
      temp[i] = a[i][indexMap[category]];
    }
    console.log(temp);
    var trace = {
      x: temp,
      type: 'histogram',
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
