const fetch = require("node-fetch");
require('dotenv').config()

const getUsersList_URL = `https://forum.1hive.org/directory_items.json?period="weekly"&order="days_visited"`;
const getSpecificUser_URL = `https://forum.1hive.org/admin/users/{$discourse_id}.json`;


const options = {
    method: 'GET',
    headers: {
        'Api-Key': process.env.API_KEY,
        'Api-Username': process.env.API_ADMIN_USERNAME
    }
}


const discord_Messages = {
    opening_message: `To link your Discourse account to be suited for the 1hive Pollen distribution, \n
     you must go to your https://forum.1hive.org account and in your Account settings and change your Name field temporarily into this:\n
     verification_code: ${verification_code}\n\n
     Once this step has been complete use the command **!hny discourse_check ${verification_code}**`,
    match_found: `Your discourse ID was found and your username should be ${discourse_username} \n If that isn't correct people let us know in #pollen`,
    match_notFound: `No Discourse ID was found with the verification_code, could you double check your code has been saved in the Name field of your account?`,
    error: `There is an error with the bot`
}



// external function that will be called by the discord app when user confirms it has changed the name with the verification_code
// the discord_id can be changed by any other identifier like a wallet address in the future

// discord_id of user is Mandatory!  verification_code should only be sent if the user uses the " !hny discourse_check ${verification_code} " code

function discourseHandler(discord_id, verification_code) {
    if (!verification_code) { 
        verification_code = createVerificationCode()
        let message = messageBuilder(verification_code)
        tempStorage[discord_id]=verification_code;
        return { discord: discord_id,  message: message }
     }
    if (discord_id && verification_code && verification_code === tempStorage[discord_id]){
        let response = matchUser(discord_id, verification_code)
        return response
    }
    
}

// should be good without pagination, the api docs aren't very clear how pagination works so might have to be tweaked later 
// in order to loop until all members are listed (the request options should be good filtering  the new members wanting to join)
async function getUsersList() {
    let list = await fetch(getUsersList_URL, options)
        .catch(err => console.log(err));
    list = await list.json()
    return list;
}

// just in case we need it
async function getSpecificUser(discourse_id) {
    let userJson = await fetch(getSpecificUser_URL, options)
        .then(res => res.json())
        .then(json => console.log(json))
        .catch(err => console.log(err));
    return userJson
}


// main logic to match a user

async function matchUser(discord_id, verification_code) {
    let list = await getUsersList();
    let users = list.directory_items;
    let discourse_id = false
    let discourse_username = false
    let error = false;
    for (let obj = 0; obj < users.length; obj++) {
        if (typeof verification_code != String) { obj = users.length; error = true };
        if (obj.user.name === verification_code) {
            discourse_id = obj.user.id;
            discourse_username = obj.user.username;
            obj = users.length;
        }
    }
    if (verification_code && discourse_username) {delete tempStorage[discord_id]}
    let message = messageBuilder(verification_code, discourse_username, error)
    return { discord: discord_id, discourse: discourse_id, message: message }
}

// generate random code for user

function createVerificationCode() {
    let code = Math.random().toString(36).substr(2, 10);
    return code
}

function messageBuilder(verification_code, discourse_username, error) {
    if (error) { return discord_Messages.error }
    if (!verification_code) {
        return discord_Messages.opening_message;
    }
    else if (verification_code && discourse_username) {
        return discord_Messages.match_found;
    }
    else if (verification_code && !discourse_username) {
        return discord_Messages.match_notFound;
    }
}


let tempStorage = {}

export default { discourseHandler }