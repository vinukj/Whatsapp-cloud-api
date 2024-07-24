const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Use environment variables
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const accessToken = process.env.ACCESS_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.status(200).send("hello this is webhook setup");
});

app.post('/sendMessage', (req, res) => {
    const { to, templateName, languageCode } = req.body;

    if (!to || !templateName || !languageCode) {
        return res.status(400).json({ status: false, message: 'Missing required parameters' });
    }

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode
            }
        }
    };
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
    axios.post(url, data, { headers })
        .then(response => {
            console.log("Response data:", response.data);
            res.status(200).json({ status: true, respondData: response.data });
        })
        .catch(error => {
            console.error("Error sending message:", error.response ? error.response.data : error.message);
            res.status(500).json({ status: false, error: error.response ? error.response.data : error.message });
        });
});

app.post("/sendMessage-noTemplate", (req, res) => {
    const phoneNumber = req.body.phoneNumber;
    const messageBody = req.body.message;

    const phoneNoId = phoneNumberId;

    const sendMessage = () => {
        axios({
            method: "POST",
            url: `https://graph.facebook.com/v19.0/${phoneNoId}/messages`,
            data: {
                messaging_product: "whatsapp",
                to: phoneNumber,
                text: {
                    body: messageBody
                }
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            console.log("Message sent successfully:", response.data);
            res.status(200).send("Message sent successfully");
        })
        .catch(error => {
            const errorCode = error.response.data.error.code;
            const errorTitle = error.response.data.error.error_data.details;

            if (errorCode === 131047 && errorTitle.includes('24 hours')) {
                //sendTemplateMessage();
            } else {
                console.error("Error sending message:", error.response ? error.response.data : error.message);
                res.status(500).send("Error sending message");
            }
        });
    };

    sendMessage();
});

app.get('/webhook', (req, res) => {
    console.log('Received webhook verification request:', req.query);
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log("Response Challenge data:", challenge);
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Forbidden');
        }
    } else {
        res.status(400).send('Bad Request');
    }
});

// Webhook endpoint to handle incoming messages
app.post('/webhook', (req, res) => {
    //console.log('Received webhook payload:', req.body);
    const entry = req.body.entry;

    if (entry && entry.length > 0) {
        entry.forEach(change => {
            const changes = change.changes;

            if (changes && changes.length > 0) {
                changes.forEach(changeItem => {
                    const value = changeItem.value;

                    // Process messages
                    const messages = value.messages;
                    if (messages && messages.length > 0) {
                        messages.forEach(message => {
                            if (message.type === 'text') {
                                const from = message.from;
                                const messageBody = message.text.body;
                                console.log(`Reply from ${from}: ${messageBody}`);

                                // Send a reply
                                sendReplyMessage(from, `Echo: ${messageBody}`);
                            }
                        });
                    }

                    // Process statuses
                    // const statuses = value.statuses;
                    // if (statuses && statuses.length > 0) {
                    //     statuses.forEach(status => {
                    //         const recipientId = status.recipient_id;
                    //         console.log(`Recipient ID: ${recipientId}`);
                    //     });
                    // }
                });
            } else {
                console.log('No changes found in this entry object.');
            }
        });

        res.sendStatus(200);
    } else {
        console.log('No entry data found.');
        res.sendStatus(200);
    }
});

// Function to send a reply message
const sendReplyMessage = (to, messageBody) => {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: to,
        text: {
            body: messageBody
        }
    };
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    axios.post(url, data, { headers })
        .then(response => {
            //console.log("Reply sent successfully:", response.data);
        })
        .catch(error => {
            console.error("Error sending reply:", error.response ? error.response.data : error.message);
        });
};

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});