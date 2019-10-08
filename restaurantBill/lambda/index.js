const Alexa = require('ask-sdk-core');
const awsSDK = require('aws-sdk');

const util = require('util');

const docClient = new awsSDK.DynamoDB.DocumentClient();
const orderTable = 'orderTable';

const dbScan = util.promisify(docClient.scan, docClient);
const dbGet = util.promisify(docClient.get, docClient);
const dbPut = util.promisify(docClient.put, docClient);
const dbDelete = util.promisify(docClient.delete, docClient);


const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
  
    const speakOutput = 'Hello, Welcome to the restaurant. We have Idli, Dosa, Parantha and Samosa today. What would you like to order?';

  
    return handlerInput.responseBuilder
      .speak(speakOutput) 
      .getResponse();
  },
};

const NoteOrderHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'noteOrderIntent';
  },
  handle(handlerInput) {
    
    
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    
    const item = handlerInput.requestEnvelope.request.intent.slots.item.value;
    const quantity = handlerInput.requestEnvelope.request.intent.slots.quantity.value;
    const speakOutput = 'I have added ' + quantity + ' ' + item + ' to the order';
    var price;

    if(item === 'dosa')
        price = 30;
    else if(item === 'idli')
        price = 10;
    else if(item === 'parantha')
        price = 40;
    else if(item === 'samosa')
        price = 15; 

   const dynamoParams = {
        Tablename: orderTable,
        Item: {
            Name: userId,
            Item: item,
            Quantity: quantity,
            Price: price
        }

    };

    dbPut(dynamoParams); 


    return handlerInput.responseBuilder
      .speak(speakOutput) 
      .getResponse();
  },
};

const BillHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'billIntent';
  },
  handle(handlerInput) {
    
    
    const userId = handlerInput.requestEnvelope.context.System.user.userId;
    var total = 0;

    const dynamoParams = {
        TableName : orderTable,
        FilterExpression: 'UserId = :user_id',
        ExpressionAttributeValues: { ':user_id': userId }
    }
    
    dbScan(dynamoParams).then(data =>{
        data.Items.foreach(function(Item){
            total += Item.Quantity*Item.Price;
        })
    })

    const speakOutput = 'Your bill is ' + total + ' rupees';

    //dbDelete(dynamoParams);
    
    return handlerInput.responseBuilder
    .speak(speakOutput)
    .getResponse();

    
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const CancelAndStopHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(error.trace);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    NoteOrderHandler,
    BillHandler,
    HelpHandler,
    CancelAndStopHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
