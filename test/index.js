const vows = require("vows");
const assert = require("assert");
const gamequery = require("../lib/index.js");

// Describe main module
vows.describe('Gamequery').addBatch({
    // This basically tests for nothing
    // This is done just to make sure that the package has no random errors that stop it from executing normally
    "when querying a random Minecraft server": {
        topic: function(){
            gamequery.query({
                type: 'minecraft',
                host: 'mc.example.com'
            }).then((state) => {
                
            }).catch((error) => {
                
            });

            this.callback();
        },
        "we get an error" : (err)=>{
            assert.isUndefined(err);
        }
    },
}).export(module);