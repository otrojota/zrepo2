const MongoClient = require('mongodb').MongoClient;

class MongoDB {
    static instances() {
        if (MongoDB.readInstance) return {mongoRead: MongoDB.readInstance, mongoWrite: MongoDB.writeInstance}
        if (process.env.MONGO_READ_URL) {
            MongoDB.readInstance = new MongoDB(process.env.MONGO_READ_URL);
            MongoDB.writeInstance = new MongoDB(process.env.MONGO_WRITE_URL);
        } else {
            MongoDB.readInstance = new MongoDB(process.env.MONGO_URL);
            MongoDB.writeInstance = MongoDB.readInstance;
        }
        return {mongoRead: MongoDB.readInstance, mongoWrite: MongoDB.writeInstance}
    }

    constructor(url) {
        this.client = null;

        this.databaseURL = url;
        this.databaseName = process.env.MONGO_DATABASE || "zrepo";

        this.db = null;        
    }
    get connected() {return this.client?true:false}

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async init() {
        try {
            this.client = new MongoClient(this.databaseURL, {useNewUrlParser:true, useUnifiedTopology:true});
            await this.client.connect();
            this.db = this.client.db(this.databaseName); 
            let col = await this.collection("process_execution");
            await col.createIndex({running:1});
            await col.createIndex({code:1, running:1});
        } catch(error) {
            console.error("[MongoDB] Cannot connect to Database '" + this.databaseName + "'");
            console.error(error);            
        }
    }

    isInitialized() {return this.db?true:false}

    async collection(name) {
        try {
            if (!this.db) throw "MongoDB connection to '" + this.databaseName + "' not initialized";
            return this.db.collection(name);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = MongoDB.instances();