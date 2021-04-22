import * as jQuery from '../jquery/dist/jquery.js';

var modelJSON =  (callback) => {
    $.getJSON("resources/modelJSON.json", function (data) {
        modelJSON = data;
        // console.log(modelJSON);
        // $.each(data, function (i, item) {
        //     console.log(item.name);
        // });
        callback(modelJSON)
    });
}

export { modelJSON };
