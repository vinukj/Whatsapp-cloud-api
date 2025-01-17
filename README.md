## Overview
This code sets up an Express.js server with endpoints to send WhatsApp messages using the Meta WhatsApp API and to handle webhook events from WhatsApp. It also uses environment variables to store sensitive data.

## Dependencies and Environment Variables
express: A web framework for Node.js.
bodyParser: Middleware to parse incoming request bodies.
axios: A promise-based HTTP client for making API requests.
dotenv: A module to load environment variables from a .env file.

## Installation
npm install

## Running
npm start

## Port FOrwarding
In terminal , choose PORTS > port forwading and once you do that make the url public


## /sendMessage Endpoint (With Template)
Accepts POST requests with to, templateName, and languageCode in the body.
Checks for missing parameters and returns a 400 status if any are missing.
Sends a POST request to the WhatsApp API to send a message template.
Logs the response data and returns it in the response. Logs errors if the request fails.


## To send Message via template
Ensure you create a message template in the corresponding WA Business account id

https://{yoururl}/sendMessage


{
    "to": "+917483039349",
    "templateName": "sample",
    "languageCode": "en"
}

## Verify supported languages here
https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/supported-languages/

## Create Message template here
https://business.facebook.com/wa/manage/message-templates/

## Send message without Template 
Use end point /sendMessage-noTemplate
JSON body

{
  "phoneNumber": "1234567890",
  "message": "Hello, this is a test message!"
}


## /webhook GET Endpoint
Handles GET requests for webhook verification from WhatsApp.
Verifies the request by checking hub.mode, hub.challenge, and hub.verify_token.
If valid, responds with the hub.challenge value to verify the webhook.


## Verify challenge
https://{yoururl}/webhook?hub.mode=subscribe&hub.challenge=1234567890&hub.verify_token=yourtoken


## /webhook POST Endpoint
Handles POST requests for incoming webhook events from WhatsApp.
Logs the incoming payload.
Extracts message details and logs them.
Responds with a 200 status to acknowledge receipt.
Send message for sending teh received message


## Enable Webhook on Meta
Under Webhooks of MEta with WA, we need to subscribe for relevant topics for the webhook to listen and respond

## Service user
Create a service user in Business settings , Users>System USers and create a new user . Once the user is created you can generate permanent token.
