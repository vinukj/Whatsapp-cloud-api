const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();
const path = require('path');
const app = express();
app.use(bodyParser.json());
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' });
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
app.post('/sendMessageMultiUser', async (req, res) => {
    const filePath = path.join(__dirname, 'Book1.xlsx'); 
    const accountname = req.body.accountname;
    NUMBER = req.body.amountdue;
    const duedate = req.body.duedate;
    
    const { templateName, languageCode } = req.body;
    if (!accountname ||  !duedate || !NUMBER) {
        return res.status(400).send('Missing required fields: message, phoneNoId, or accessToken');
    }

    try {
        // Read contacts from Excel file
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const contacts = xlsx.utils.sheet_to_json(worksheet);
        
        const sendMessage = (phoneNumber) => {
            
               
            const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
           
              const  data = {
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: {
                            code: languageCode
                        },
                        components: [
                     
                     {
                        type:'BODY',
                        parameters:[
                            {
                                type: "text",
                                "text": accountname
                            },
                            {
                                type: "CURRENCY",
                                "currency": {
              "fallback_value": "VALUE",
              "code": "INR",
              "amount_1000": NUMBER
            }
                                
                            },
                            {
                                type: "DATE_TIME",
                                "date_time": {
              "fallback_value": duedate
            }
                            },
                            {
                                type: "text",
                                "text": 'Pay to avoid delay fees'
                            }
                        ]
                     }
                        ]
                    },

                };
               
               const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
                return axios.post(url, data, { headers }); 
        };
        
        for (const contact of contacts) {
            const phoneNumber = contact.phoneNumber; 
               if (!phoneNumber) {
                console.error('Missing phone number for contact:', contact);
                continue;
            }

            try {
                await sendMessage(phoneNumber);
                console.log(`Message sent successfully to ${phoneNumber}`);
            } catch (error) {
                console.error(`Error sending message to ${phoneNumber}:`, error.response ? error.response.data : error.message);
            }
        }

        res.status(200).send('Messages sent successfully');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Error processing request');
    }
});
    
const formatDate = (value) => {
 
    if (!isNaN(value) && value > 25569) {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0]; // Returns date in YYYY-MM-DD format
    }
    return value; 
};
const formatParams = (params) => {
    for (const key in params) {
        params[key] = formatDate(params[key]);
    }
    return params;
};
app.post('/sendMessageByExcelUpload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: false, message: 'No file uploaded' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);
       console.log(rows)
        for (const row of rows) {
            const { phoneNumber, TemplateType, Template, languageCode, textmessage, ...params } = row;
             const formattedParams = formatParams(params);
            if (!Template && textmessage) {
                await sendTextMessage(phoneNumber, textmessage);
            } else {
                
                await handleApiCall(TemplateType, phoneNumber, Template, languageCode, formattedParams);
               
            }
            

          
        }

        res.status(200).json({ status: true, message: 'Messages sent successfully' });
    } catch (error) {
        console.error("Error processing file:", error.message);
        res.status(500).json({ status: false, error: error.message });
    }
});

const handleApiCall = async (templateType, phoneNumber, templateName, languageCode, params) => {
    switch (templateType) {
        case 'Utility':
            await sendMessageUtility(phoneNumber, templateName, languageCode, params);
            break;
        case 'Authentication':
            await sendMessageAuthentication(phoneNumber, templateName, languageCode, params);
            break;
        case 'Marketing':
                await sendMessageMarketing(phoneNumber, Template, languageCode, params);
                break;
        default:
            console.error("Unsupported template type:", templateType);
    }
};
const sendTextMessage = async (phoneNumber, messageBody) => {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        text: {
            body: messageBody
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log("Response data:", response.data);
    } catch (error) {
        console.error("Error sending text message:", error.response ? error.response.data : error.message);
    }
};

const sendMessageUtility = async (phoneNumber, templateName, languageCode, params) => {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode
            },
            components: [
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: params.param1 // accountname
                        },
                        {
                            type: 'currency',
                            currency: {
                                fallback_value: 'VALUE',
                                code: 'INR',
                                amount_1000: params.param2 // number
                            }
                        },
                        {
                            type: 'date_time',
                            date_time: {
                                fallback_value: params.param3 // duedate
                            }
                        },
                        {
                            type: 'text',
                            text: 'Pay to avoid delay fees'
                        }
                    ]
                }
            ]
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log("Response data:", response.data);
    } catch (error) {
        console.error("Error sending message:", error.response ? error.response.data : error.message);
    }
};

const sendMessageAuthentication = async (phoneNumber, templateName, languageCode, params) => {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode
            },
            components: [
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: params.param1 
                        }
                    ]
                },
                {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [
                      {
                        type: "text",
                        text: params.param1
                      }
                    ]
                  }
            ]
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log("Response data:", response.data);
    } catch (error) {
        console.error("Error sending message:", error.response ? error.response.data : error.message);
    }
};

const sendMessageMarketing = async (phoneNumber, templateName, languageCode, params) => {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode
            },
            components: [
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: params.text // sample text
                        }
                    ]
                }
            ]
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log("Response data:", response.data);
    } catch (error) {
        console.error("Error sending message:", error.response ? error.response.data : error.message);
    }
};


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