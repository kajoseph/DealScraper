const rp = require('request-promise');
const $ = require('cheerio');
const nodemailer = require('nodemailer');
const config = require('./config.json');



const url = config.url;
const notifyOnNotFound = config.notifyOnNotFound == "true";
const exitOnNotFound = config.exitOnNotFound == "true";
var lastMessageSendTime = new Date("1/1/1999");
var notFoundNotificationSent = false;


function Run(){

    if(((new Date) - lastMessageSendTime)/(1000 * 60) < 1){
        return;
    }

    rp(url)
    .then(html => {
        
        var numdealsnow = $(config.element, html).length;
        
        // If class isn't found, send notification and exit process.
        if (numdealsnow == 0 && (notifyOnNotFound || exitOnNotFound)) {
            if(!notifyOnNotFound) 
                process.exit();

            if(!notFoundNotificationSent)
                SendMail("Deal element not found.", function() { notFoundNotificationSent = true; exitOnNotFound ? process.exit() : null; });
            return;
        }

           
        // Find any open deals (where button is not disabled)
        var opendeals = [];
        for(var i = 0; i < numdealsnow; i++){
            var deal = $(config.element, html)[i];

            // if sibling (button) is not disabled, then add it to the open deals array.
            if(deal.nextSibling.attribs.disabled === undefined){
                opendeals.push(deal);
            }
        }

        // If open deals exist...
        if(opendeals.length != 0){
            // SEND EMAIL
            var message = "| ";
            opendeals.forEach((d) => {
                message += d.parentNode.previousSibling.childNodes[0].childNodes[0].data + " | "
            })

            SendMail(message + " " + url);
        }
        else {
            console.log("No deal found.");
        }
    })

}

function SendMail(message, callback){
    var transporter = nodemailer.createTransport(config.transport);
      
      var mailOptions = config.mailOptions;
      mailOptions.text = message;
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);

            // Don't send text message every second.
            lastMessageSendTime = new Date;

            // If callback function is passed, execute.
            if(typeof callback == "function"){
                callback();
            }
        }
      });
}

// Run();
setInterval(Run, 5000);