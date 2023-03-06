const config = require("./Config");
const mongo = require("../minz/MongoDB");
const httpProt = require("http");
const httpsProt = require("https");
const CronJob = require('cron').CronJob;
const moment = require("moment-timezone");
const request = require("request");
const {Kafka} = require("kafkajs");
const { resolve } = require("path");

class PluginAPI {
    static get instance() {
        if (!PluginAPI._instace) PluginAPI._instace = new PluginAPI();
        return PluginAPI._instace;
    }

    constructor() {       
        this.replicaId = this.generaToken(4);
        this.pingIntervar = setInterval(_ => this.pingSessions(), 5000);
        this.MAX_PARALELL_PROCESSES = process.env.MAX_PARALELL_PROCESSES || 10;
        this.MAX_WAIT_TO_START_MILLIS = process.env.MAX_WAIT_TO_START_MILLIS || 30000;
    }

    getConfig() {
        try {
            let c = JSON.parse(JSON.stringify(config.config));
            return c;
        } catch (error) {
            throw error;
        }
    }

    async init() {
        try {
            console.log("ZRepo PluginAPI INIT");
            if (this.cronJobs) {
                for (let job of this.cronJobs) job.stop();            
            }
            this.cronJobs = [];
            if (this.kafkaClientsConsumers) {
                for (let k of this.kafkaClientsConsumers) {
                    await k.consumer.stop();
                    await k.consumer.disconnect();
                }
            }
            this.kafkaClientsConsumers = [];

            let c = this.getConfig();
            for (let pg of (c["process-groups"] || [])) {
                for (let p of pg.content || []) {
                    for (let t of p.triggers || []) {
                        if (t.type == "cron") {
                            let job = new CronJob(t.cron, _ => this.cronTrigger(p, t), null, true, c.timeZone);
                            this.cronJobs.push(job);
                            job.start();
                        } else if (t.type == "kafka-topic") {
                            let kafka = new Kafka(t.clientConfig);
                            let consumer = kafka.consumer(t.consumerConfig);
                            try {
                                await consumer.subscribe({topic:t.topic, fromBeginning:true});
                                console.log("kafka connect");
                                await consumer.connect();
                                console.log("kafka run");
                                // No Await
                                consumer.run({
                                    eachMessage: async ({ topic, partition, message }) => {
                                        //console.log({key: message.key.toString(), value: message.value.toString(), headers: message.headers})
                                        try {
                                            let msg = message.value.toString();
                                            await this.kafkaTrigger(p, t, msg);
                                        } catch(error) {
                                            console.error(error);
                                        }                                        
                                    }
                                })
                                console.log("kafka fin");
                            } catch(error) {
                                console.error(error);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            throw error;
        }
    }

    post(url, headers, data) {
        //console.log("POST a", url, data);
        return new Promise((resolve, reject) => {
            headers = headers || {};
            headers["Content-Type"] = "application/json";
            let stData = (typeof data == "object")?JSON.stringify(data):data;
            //headers["Content-Length"] = stData.length;

            let http = url.startsWith("https")?httpsProt:httpProt;
            let options = {
                headers:headers, method:"POST"
            }     
            let buffer = "", responseError = null;   
            try {
                let req = http.request(new URL(url), options, res => {
                    if (res.statusCode != 200) {
                        responseError = "[" + res.statusCode + "] " + res.statusMessage + (buffer.length?". " + buffer:"");
                        //reject("[" + res.statusCode + "] " + res.statusMessage + (buffer.length?". " + buffer:""));
                        //return;                    
                    }
                    res.on("error", err => reject(err));
                    res.on('data', d => {
                        buffer += d
                    });
                    res.on("end", _ => {
                        if (responseError) {
                            reject(responseError + ". " + buffer);
                        } else {
                            if (res.headers && res.headers["content-type"] && res.headers["content-type"].startsWith("application/json")) {
                                try {
                                    let json = JSON.parse(buffer);
                                    resolve(json);
                                    return;
                                } catch(error) {
                                    console.error("Invalid json from plugin", buffer, error);
                                    reject(error);
                                }
                            } else {
                                resolve(buffer);
                            }
                        }
                    })
                });
                req.setTimeout(0);
                req.on("error", err => reject(err));
                req.write(stData);
                req.end();
            } catch(error) {
                reject(error);
            }
        })        
    }

    returnError(res, error, status) {
        if (typeof error == "string") {
            res.status(status || 400).send(error);
        } else { 
            console.error("Error Interno:", error);        
            console.trace(error);
            res.status(status || 500).send("Error Interno");
        }
    }
    returnOK(res, ret) {
        res.setHeader('Content-Type', 'application/json');
        res.status(200);
        if (typeof ret == "number") res.send("" + ret);
        else res.send(ret?ret:null);    
    }

    generaToken(largo = 40) {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
        let st = "";
        for (let i=0; i<largo; i++) st += chars[parseInt(chars.length * Math.random())];
        return st;
    }

    async registerEndPoints(app) {
        try {
            app.post("/pluginAPI/register", (req, res) => this.registerPlugin(req, res));
            app.post("/pluginAPI/addLog", async (req, res) => {
                try {
                    if (req.body.instanceId == "-1") {
                        this.returnOK(res, {});
                        return;
                    }
                    await this.addLog(req.body.instanceId, req.body.type, req.body.text);
                    this.returnOK(res, {});
                } catch(error) {
                    this.returnError(res, error.toString());
                }
            });
            app.post("/pluginAPI/finishProcess", async (req, res) => {
                try {
                    if (req.body.instanceId == "-1") {
                        this.returnOK(res, {});
                        return;
                    }
                    await this.finishProcess(req.body.instanceId);
                    this.returnOK(res, {});
                } catch(error) {
                    this.returnError(res, error.toString());
                }
            });
            app.post("/pluginAPI/setProcessInstanceDescription", async (req, res) => {
                try {
                    if (req.body.instanceId == "-1") {
                        this.returnOK(res, {});
                        return;
                    }
                    await this.setProcessInstanceDescription(req.body.instanceId, req.body.description);
                    this.returnOK(res, {});
                } catch(error) {
                    this.returnError(res, error.toString());
                }
            });
            app.get("/pluginAPI/status/:instanceId", async (req, res) => {
                try {
                    if (req.body.instanceId == "-1") {
                        this.returnOK(res, {status: "ok"});
                        return;
                    }
                    let status = await this.getStatus(req.params.instanceId);
                    this.returnOK(res, status);
                } catch(error) {
                    this.returnError(res, error.toString());
                }
            });
            app.get("/pluginAPI/runningInstances/:instanceId", async (req, res) => {
                try {
                    let rows = await this.getRunningInstances(req.params.instanceId);
                    this.returnOK(res, rows);
                } catch(error) {
                    this.returnError(res, error.toString());
                }
            });
            app.get("/proxy/:plugin/*", async (req, res) => {
                let col = await mongo.collection("plugin_sessions");
                let pluginCode = req.params.plugin;
                let sesion = await col.findOne({pluginCode:pluginCode});
                if (sesion) {
                    let originalUrl = req.originalUrl;
                    let p0 = originalUrl.indexOf("/",7);
                    let newurl = sesion.callbackURL + originalUrl.substr(p0);
                    request(newurl).pipe(res);
                } else {
                    this.returnError(res, "Plugin '" + pluginCode + "' no encontrado", 403);
                }
            });
            app.get("/pluginAPI/processData/:process", async (req, res) => {
                try {
                    let data = await this.getProcessData(req.params.process);
                    this.returnOK(res, data);
                } catch(error) {
                    this.returnError(res, error.toString());
                }
            });
            app.post("/pluginAPI/processData/:process", async (req, res) => {
                try {
                    await this.setProcessData(req.params.process, req.body);
                    this.returnOK(res, {});
                } catch(error) {
                    this.returnError(res, error.toString());
                }
            });
            let col = await mongo.collection("process_execution");
            await col.createIndex({started:1});
            col = await mongo.collection("process_data");
        } catch(error) {
            throw error;
        }
    }

    async registerPlugin(req, res) {
        try {
            let code = req.body.code;
            let pwd = req.body.pwd;
            let callbackURL = req.body.callbackURL;
            let processes = req.body.processes;
            if (!code || !pwd || !callbackURL) {
                this.returnError(res, "Argumentos de registro inválidos");
                return;
            }
            let c = this.getConfig();
            if (!c.plugins || !c.plugins[code] || c.plugins[code].pwd != pwd) {
                this.returnError(res, "Credenciales de Registro Inválidas");
                return;
            }
            // Grabar, generar o reutilizar token
            let col = await mongo.collection("plugin_sessions");
            let sesion = await col.findOne({pluginCode:code});
            if (sesion) {
                let col = await mongo.collection("plugin_sessions");
                await col.updateOne({_id:sesion._id}, {$set:{aliveFrom:Date.now(), processes:processes}});
                this.returnOK(res, {token:sesion._id})
                console.log("- Plugin [" + code + "] registrado (reutiliza sesión)");
                return;
            }
            sesion = {_id:this.generaToken(), pluginCode:code, callbackURL:callbackURL, aliveFrom:Date.now(), processes:processes};
            await col.insertOne(sesion)
            this.returnOK(res, {token:sesion._id})
            console.log("- Plugin [" + code + "] registrado (crea sesión)");
        } catch (error) {
            console.error("Error Interno", error);
            this.returnError(res, error);
        }
    }

    async setAlive(token) {
        try {
            let col = await mongo.collection("plugin_sessions");
            await col.updateOne({_id:token}, {$set:{aliveFrom:Date.now()}});
        } catch (error) {
            throw error;
        }
    }
    async logout(token) {
        try {
            let col = await mongo.collection("plugin_sessions");
            await col.deleteOne({_id:token});
        } catch (error) {
            throw error;
        }
    }

    async ping(session) {
        try {
            let r = await this.post(session.callbackURL + "/zcb/" + session.pluginCode + "/ping", {}, {ping:true});
            if (!r.pong) throw "NO hay pong";
            if (r.token != session._id) throw "Respuesta inválida";
        } catch (error) {
            throw error;
        }
    }

    async pingSessions() {
        try {
            let treshold = Date.now() - 10 * 1000;
            let col = await mongo.collection("plugin_sessions");
            let sessions = await col.find({aliveFrom:{$lte:treshold}}).toArray();
            for (let s of sessions) {
                try {
                    await this.ping(s);
                    await this.setAlive(s._id);
                } catch(error) {
                    console.log("Ping Error", error);
                    await this.logout(s._id);
                }
            }
        } catch (error) {
            console.error("PluginAPI: pingSessions error:");
            console.error(error);
        }
    }

    async getPluginSession(pluginCode) {
        try {
            let col = await mongo.collection("plugin_sessions");
            let session = await col.findOne({pluginCode:pluginCode});
            return session;
        } catch (error) {
            throw error;
        }
    }

    async getProcessesInGroup(groupId) {
        try {
            let col = await mongo.collection("plugin_sessions");
            let sessions = await col.find({}).toArray();
            let procs = {};
            for (let s of sessions) {
                for (let p of s.processes || []) {
                    p.pluginCode = s.pluginCode;
                    p.id = p.pluginCode + "." + p.code;
                    procs[s.pluginCode + "." + p.code] = p;
                }
            }
            let conf = this.getConfig();
            let ret = [];
            let g = (conf["process-groups"] || []).find(g => g.id == groupId);
            if (!g) {
                throw "No se encontró el grupo de procesos:" + groupId;
            }
            for (let proc of g.content || []) {
                let procDef = procs[proc.plugin + "." + proc.code];
                if (!procDef) throw "No se puede encontrar el proceso " + proc.code + " en el lplugin " + proc.plugin + " referenciado en desde el grupo " + g.name;
                procDef.triggers = proc.triggers;                
                if (procDef) ret.push(procDef);
            }
            return ret;
        } catch (error) {
            throw error;
        }
    }

    async getProcessData(process) {
        try {
            let col = await mongo.collection("process_data");
            let doc = await col.findOne({_id:process});
            return doc || {};
        } catch (error) {
            throw error;
        }
    }

    async setProcessData(process, data) {
        try {
            let col = await mongo.collection("process_data");
            await col.replaceOne({_id:process}, data, {upsert:true});
        } catch (error) {
            throw error;
        }
    }

    async startProcess(email, plugin, process, params, name, trigger) {
        try {
            await this.checkMaxRunningProcesses();

            let session = await this.getPluginSession(plugin);
            if (!session) throw "El Módulo proveedor del PlugIn '" + plugin + "' no está conectado";

            let instanceId = this.generaToken(40);            
            let col = await mongo.collection("process_execution");
            let pi = {_id:instanceId, plugin:plugin, process:process, code:plugin + "." + process, creator:email, params:params, started:Date.now(), running:true, warnings:false, errors:false, logs:[], name:name};
            await col.insertOne(pi);
            try {
                await this.post(session.callbackURL + "/zcb/" + session.pluginCode + "/exec", {}, {
                    process:process, instanceId:instanceId, params:params, trigger: trigger || {}
                });
            } catch(error2) {
                console.error("Error iniciando proceso " + plugin + "." + process, error2);
                await this.addLog(instanceId, "E", error2.toString());
                await this.finishProcess(instanceId);
            }
            return instanceId;
        } catch (error) {
            console.error(error);
        }
    }

    async getRunningInstances(instanceId) {
        try {
            // Obtiene las otras instancias en ejecución del mismo proceso
            let col = await mongo.collection("process_execution");
            let pi = await col.findOne({_id:instanceId});
            if (!pi) throw "No se encontró la instancia del proceso";
            let pis = await col.find({code:pi.code, running: true}, {projection:{_id:1, code:1, creator:1, params:1, started:1, name:1}}).toArray();
            pis = pis.filter(p => (p._id != instanceId)).map(p => ({instanceId:p._id, code:p.code, creator:p.creator, params:p.params, started:p.started, name:p.name}));
            return pis;
        } catch (error) {
            throw error;
        }
    }

    async runDataSetPreprocessor(process, rows, trigger) {
        try {
            let session = await this.getPluginSession(process.plugin);
            if (!session) throw "El Módulo proveedor del PlugIn '" + process.plugin + "' no está conectado";

            // Si el trigger indica "activateLogs" se crea instancia para registro de logs. Si no, no se crea (instanceId = -1)
            let instanceId = "-1";
            if (trigger.activateLogs) {
                instanceId = this.generaToken(40);
                let col = await mongo.collection("process_execution");
                let pi = {_id:instanceId, plugin:process.plugin, process:process.code, code:process.plugin + "." + process.code, creator:"Preprocessor for " + trigger.dataSet, params:rows, started:Date.now(), running:true, warnings:false, errors:false, logs:[], name:"Preprocessor for " + trigger.dataSet};
                await col.insertOne(pi);
            }
            
            try {
                let newRows = await this.post(session.callbackURL + "/zcb/" + session.pluginCode + "/execSync", {}, {
                    process:process.code, instanceId:instanceId, params:rows, trigger: trigger
                });
                return newRows;
            } catch(error2) {
                console.error("Error ejecutando preprocesador sincrónico " + process.plugin + "." + process.code, error2);
                await this.addLog(instanceId, "E", error2.toString());
                await this.finishProcess(instanceId);
            }
            return instanceId;
        } catch (error) {
            console.error(error);
        }
    }

    async checkMaxRunningProcesses() {
        try {
            let col = await mongo.collection("process_execution");
            let n, t0 = Date.now(), timeout = false;
            do {
                timeout = (Date.now() - t0) > this.MAX_WAIT_TO_START_MILLIS;
                if (!timeout) {                
                    n = await col.find({running:true}).count();
                    if (n >= this.MAX_PARALELL_PROCESSES) {
                        // Esperar 1 segundo                        
                        console.log("esperando 1 segundo por máximo de procesos corriendo alcanzado");
                        await (new Promise(resolve => setTimeout(_ => resolve(), 1000)));
                    }
                }
            } while(n >= this.MAX_PARALELL_PROCESSES && !timeout);
            if (timeout) throw "Timeout esperando por máximo de procesos en ejecucion";
        } catch (error) {
            throw error;
        }
    }

    async finishProcess(instanceId) {
        try {
            let col = await mongo.collection("process_execution");
            await col.updateOne({_id:instanceId}, {$set:{finished:Date.now(), running:false, canceling:false}});
        } catch (error) {
            throw error;
        }
    }

    async setProcessInstanceDescription(instanceId, description) {
        try {
            let col = await mongo.collection("process_execution");
            await col.updateOne({_id:instanceId}, {$set:{name:description}});
        } catch (error) {
            throw error;
        }
    }

    async findExecutions(processes, pluginCode, processCode, start, end, onlyRunning, withErrors, withErrorsOrWarnings) {
        try {
            let filter = {started:{$gte:start, $lte:end}};
            if (pluginCode) {
                filter.plugin = pluginCode;
                filter.process = processCode;
            } else {
                filter.code = {$in:processes};
            }
            if (onlyRunning) filter.running = true;
            if (withErrors) filter.errors = true;
            else if (withErrorsOrWarnings) filter["$or"] = [{errors:true}, {warnings:true}];
            let col = await mongo.collection("process_execution");
            let rows = await col.find(filter, {projection:{_id:1, started:1, finished:1, name:1, errors:1, warnings:1, running:1, canceling:1}}).toArray();
            return rows;
        } catch (error) {
            throw error;
        }
    }

    async getExecutionDetails(instanceId) {
        try {            
            let col = await mongo.collection("process_execution");
            let x = await col.findOne({_id:instanceId}, {projection:{_id:1, name:1, plugin:1, process:1, started:1, finished:1, running:1, canceling:1, errors:1, warnings:1, creator:1, params:1}});
            return x;
        } catch (error) {
            throw error;
        }
    }

    async detenerProceso(instanceId, email) {
        try {            
            let col = await mongo.collection("process_execution");
            await this.addLog(instanceId, "W", "Se solicita cancelación de la ejecución por " + email);
            await col.updateOne({_id:instanceId}, {$set:{canceling:true}});
        } catch (error) {
            throw error;
        }
    }

    async finalizarProceso(instanceId, email) {
        try {            
            let col = await mongo.collection("process_execution");
            let x = await col.findOne({_id:instanceId}, {projection:{running:1, canceling:1}});
            if (!x) throw "No se encontró la ejecución del proceso";
            if (!x.running) throw "El proceso ya no está en ejecución";
            await col.updateOne({_id:instanceId}, {$set:{canceling:false}});
            await this.addLog(instanceId, "E", "Se ha forzado la detención del proceso. Se marca como detenido por " + email);
            await this.finishProcess(instanceId);
        } catch (error) {
            throw error;
        }
    }

    async addLog(instanceId, type, text) {
        try {
            if (!type || type.length != 1 || ("IEW".indexOf(type.toUpperCase()) < 0)) throw "Tipo de entrada de log inválida: " + type + ", se esperaba: I, W, E";
            type = type.toUpperCase();            
            let doc = {time:Date.now(), type, text};
            let col = await mongo.collection("process_execution");
            let x = await col.findOne({_id:instanceId}, {projection:{warnings:1, errors:1, canceling:1, running:1}});
            if (!x) {
                console.error("No se encontró el proceso " + instanceId + " para escribir el log " + type + ":" + text);
            }
            await col.updateOne({_id:instanceId}, {$push:{logs:doc}});
            if (!x.warnings && type == "W") {
                await col.updateOne({_id:instanceId}, {$set:{warnings:true}});
            } else if (!x.errors && type == "E") {
                await col.updateOne({_id:instanceId}, {$set:{errors:true}});
            }
        } catch (error) {
            throw error;
        }
    }

    async getStatus(instanceId) {
        try {
            let col = await mongo.collection("process_execution");
            let x = await col.findOne({_id:instanceId}, {projection:{running:1, canceling:1}});
            return x;
        } catch (error) {
            throw error;
        }
    }

    async getLogs(instanceId, fromIndex) {
        try {
            let col = await mongo.collection("process_execution");
            let x = await col.findOne({_id:instanceId}, {projection:{logs:1}});
            let logs = (x.logs || []).map((l, idx) => ({idx, time:l.time, type:l.type, text:l.text.length > 70?l.text.substr(0,70) + "...":l.text}));
            if (fromIndex) logs = logs.filter(l => l.idx > fromIndex);
            return logs;
        } catch (error) {
            throw error;
        }
    }

    async getLogLine(instanceId, index) {
        try {
            let col = await mongo.collection("process_execution");
            let x = await col.findOne({_id:instanceId}, {projection:{logs:1}});
            return x.logs[index];
        } catch (error) {
            throw error;
        }
    }

    async cronTrigger(process, trigger) {
        try {
            let f = moment.tz(Date.now(), this.getConfig().timeZone).format("YYYY-MM-DD HH:mm:ss");
            let triggerId = trigger.name + "-" + f;
            let col = await mongo.collection("cron_procs_trigger");
            let r;
            try {
                r = await col.findOneAndUpdate({_id:triggerId}, {$set:{time:Date.now(), serverId:this.replicaId}}, {upsert:true});
            } catch(error) {
                return; // dupKey
            }
            if (r.value) return; // ejecutado por otra replica

            let piSesion = await this.getPluginSession(process.plugin);
            if (!piSesion) {
                console.error("Iniciando proceso CRON para '" + process.code + "'. Plugin " + process.plugin + " no está registrado");
                return;
            }
            let procDec = piSesion.processes.find(p => p.code == process.code);
            if (!procDec) {
                console.error("Iniciando proceso CRON para '" + process.code + "'. Plugin " + process.plugin + " no declara al proceso");
                return;
            }
            let params = {};
            for (let param of (procDec.params || [])) {
                params[param.code] = trigger[param.code];
            }
            await this.startProcess("cronJob", process.plugin, process.code, params, trigger.name, trigger);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async kafkaTrigger(process, trigger, message) {
        try {
            let piSesion = await this.getPluginSession(process.plugin);
            if (!piSesion) {
                // console.error("Iniciando proceso KAFKA para '" + process.code + "'. Plugin " + process.plugin + " no está registrado");
                throw "Iniciando proceso KAFKA para '" + process.code + "'. Plugin " + process.plugin + " no está registrado";
            }
            let procDec = piSesion.processes.find(p => p.code == process.code);
            if (!procDec) {
                // console.error("Iniciando proceso KAFKA para '" + process.code + "'. Plugin " + process.plugin + " no declara al proceso");
                throw "Iniciando proceso KAFKA para '" + process.code + "'. Plugin " + process.plugin + " no declara al proceso";
            }
            let params = {message};
            await this.startProcess("kafkaTopic", process.plugin, process.code, params, trigger.name, trigger);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

module.exports = PluginAPI.instance;