const ZModule = require("./z-server").ZModule;
const config = require("./Config");
const dimensions = require("./../minz/Dimensions");
const dataSets = require("../dataSets/DataSets");
const mongo = require("../minz/MongoDB");
const bcrypt = require('bcryptjs');
const uuid = require('uuid');
const nodemailer = require("nodemailer");
const pluginAPI = require("./PluginAPI");

class Portal extends ZModule {
    static get instance() {
        if (Portal.singleton) return Portal.singleton;
        Portal.singleton = new Portal();
        return Portal.singleton;
    }

    generaToken(largo = 40) {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
        let st = "";
        for (let i=0; i<largo; i++) st += chars[parseInt(chars.length * Math.random())];
        return st;
    }

    _encript(pwd) {
        return new Promise((onOk, onError) => {
            bcrypt.hash(pwd, 8, (err, hash) => {
                if (err) onError(err);
                else onOk(hash);
            });
        });
    }

    _compareWithEncripted(pwd, hash) {
        return bcrypt.compare(pwd, hash);
    }

    async _getUserSession(token) {
        try {
            let col = await mongo.collection("user_sesion");
            let s = await col.findOne({_id:token});
            return s;
        } catch (error) {
            throw error;
        }
    }
    async _checkAdmin(token) {
        try {
            //if (email == config.adminLogin && pwd == config.adminPassword) return true;
            let s = await this._getUserSession(token);
            if (!s) return false;
            return s.isAdmin;
        } catch(error) {
            throw error;
        }
    }
    _isGlobalAdmin(email) {
        return email == config.adminLogin;
    }
    async login(email, pwd) {
        try {
            let u;
            let col = await mongo.collection("users");
            if (email == config.adminLogin && pwd == config.adminPassword) {
                u = {name:"Administrador Global", email:email, admin:true, _globalAdmin:true};
            } else {
                u = await col.findOne({_id:email}, {projection:{_id:1, name:1, admin:1, pwd:1}});
                if (!u) throw "Usuario o Contraseña Inválidos";
                if (!u.pwd) throw "Aún no ha creado su contraseña Inicial. Use la opción 'Olvidó Contraseña' para crearla";
                const pwdValida = await this._compareWithEncripted(pwd, u.pwd);
                if (!pwdValida) throw "Usuario o Contraseña Inválidos";
                u.email = u._id;
                delete u.pwd;
                delete u.creationCode;
            }
            
            col = await mongo.collection("user_sesion");
            let s = await col.findOne({email:email});
            if (s) {
                await col.updateOne({_id:s._id}, {$set:{isAdmin:u.admin?true:false}});
                return {token:s._id, user:u, isAdmin:u.admin?true:false}
            }
            s = {_id:uuid.v4(), email:email, loginTime:Date.now(), isAdmin:u.admin?true:false}
            await col.insertOne(s);
            s.user = u;
            delete s.email;
            s.token = s._id;

            return s;
        } catch (error) {
            throw error;
        }
    }

    async logout(authToken) {
        try {
            let col = await mongo.collection("user_sesion");
            await col.deleteOne({_id:authToken});
        } catch (error) {
            throw error;
        }
    }

    async getUsers() {
        try {
            let col = await mongo.collection("users");
            let rows = await col.find({}, {projection:{_id:1, name:1, admin:1}}).sort({email:1}).toArray();
            return rows.map(r => ({
                email:r._id, name:r.name, admin:r.admin?true:false
            }))
        } catch (error) {
            throw error;
        }
    }
    async addUser(authToken, user) {
        try {
            if (!this._checkAdmin(authToken)) throw "No Autorizado";
            let col = await mongo.collection("users");
            let doc = {_id:user.email, name:user.name, admin:user.admin, folders:[], groups:{}};
            await col.insertOne(doc);
        } catch (error) {
            throw error;
        }
    }
    async saveUser(authToken, user) {
        try {
            if (!this._checkAdmin(authToken)) throw "No Autorizado";
            let col = await mongo.collection("users");
            let doc = {$set:{name:user.name, admin:user.admin?true:false}};
            await col.updateOne({_id:user.email}, doc);
        } catch (error) {
            throw error;
        }
    }
    async deleteUser(authToken, email) {
        try {
            if (!this._checkAdmin(authToken)) throw "No Autorizado";
            // TODO: Remover dashboards y quitarlos desde favoritos de otros usuarios
            let col = await mongo.collection("users");            
            await col.deleteOne({_id:email});            
        } catch (error) {
            throw error;
        }
    }
    async getUserFavs(authToken) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let col = await mongo.collection("users");
            let u = await col.findOne({_id:sesion.email}, {projection:{favs:1, mostFav:1, priorMostFav:1}});
            if (!u) throw "NO se encontró el usuario " + sesion.email;
            return {favs:u.favs || [], mostFav:u.mostFav, priorMostFav:u.priorMostFav}
        } catch (error) {
            throw error;
        }
    }
    async _setUserFavs(authToken, favs, mostFav, priorMostFav) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let col = await mongo.collection("users");
            await col.updateOne({_id:sesion.email}, {$set:{favs:favs, mostFav:mostFav, priorMostFav: priorMostFav}});
        } catch (error) {
            throw error;
        }
    }
    async toggleUserFav(authToken, dashboardId) {     
        try {
            let {favs, mostFav, priorMostFav} = await this.getUserFavs(authToken);
            let idx = favs.findIndex(id => id == dashboardId);
            if (idx >= 0) {
                if (dashboardId == mostFav) {
                    // ciclo completo, eliminar de favoritos
                    mostFav = priorMostFav;
                    priorMostFav = dashboardId;
                    favs.splice(idx,1);
                } else {
                    // segundo click: selecciona como mostFav
                    priorMostFav = mostFav;
                    mostFav = dashboardId;
                }
            } else {
                favs.push(dashboardId);
            }
            await this._setUserFavs(authToken, favs, mostFav, priorMostFav);
        } catch (error) {
            throw error;
        }
    }
    async getUserGroupsVisibility(authToken, email) {
        try {
            if (!email) {
                let sesion = await this._getUserSession(authToken);
                if (!sesion) throw "No Autorizado";
                email = sesion.email;
            }
            if (this._isGlobalAdmin(email)) return {};
            if (!this._checkAdmin(authToken)) throw "No Autorizado";
            let col = await mongo.collection("users");
            let groups = (await col.findOne({_id:email}, {projection:{groups:1}})).groups || {};
            return groups;
        } catch (error) {
            throw error;
        }
    }
    async togleGroupVisibility(authToken, email, groupId, permission) {        
        try {
            let groups = await this.getUserGroupsVisibility(authToken, email);
            let g = groups[groupId] || {query:false, publish:false};
            g[permission] = !g[permission];
            groups[groupId] = g;
            let col = await mongo.collection("users");
            await col.updateOne({_id:email}, {$set:{groups:groups}});
        } catch (error) {
            throw error;
        }
    }

    _getDashboardGroupsFrom(ret, groups, level) {        
        for (let g of groups) {
            ret.push({id:g.id, name:g.name, icon:g.icon, level});
            if (g.items && g.items.length) {
                this._getDashboardGroupsFrom(ret, g.items, level + 1);
            }
        }
    }
    getDashboardGroups() {
        try {
            let ret = [];
            this._getDashboardGroupsFrom(ret, this.getConfig()["dashboard-groups"] || [], 0);
            return ret;
        } catch (error) {
            throw error;
        }
    }

    /* Procesos */
    async getProcessesInGroup(authToken, groupId) {
        try {
            let procs = await pluginAPI.getProcessesInGroup(groupId);
            return procs;
        } catch (error) {
            throw error;
        }
    }

    async startProcess(authToken, plugin, process, params, name, trigger) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let instanceId = await pluginAPI.startProcess(sesion.email, plugin, process, params, name, trigger);
            return instanceId;
        } catch (error) {
            throw error;
        }
    }
    async findExecutions(authToken, processes, pluginCode, processCode, start, end, onlyRunning, withErrors, withErrorsOrWarnings) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            return await pluginAPI.findExecutions(processes, pluginCode, processCode, start, end, onlyRunning, withErrors, withErrorsOrWarnings);
        } catch (error) {
            throw error;
        }
    }
    async getExecutionDetails(authToken, instanceId) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            return await pluginAPI.getExecutionDetails(instanceId);
        } catch (error) {
            throw error;
        }
    }

    async detenerProceso(authToken, instanceId) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            return await pluginAPI.detenerProceso(instanceId, sesion.email);
        } catch (error) {
            throw error;
        }
    }

    async finalizarProceso(authToken, instanceId) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            return await pluginAPI.finalizarProceso(instanceId, sesion.email);
        } catch (error) {
            throw error;
        }
    }

    async getLogs(authToken, instanceId, fromIndex) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            return await pluginAPI.getLogs(instanceId, fromIndex);
        } catch (error) {
            throw error;
        }
    }
    async getLogLine(authToken, instanceId, index) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            return await pluginAPI.getLogLine(instanceId, index);
        } catch (error) {
            throw error;
        }
    }

    async enviaCodigoCambioPwd(email) {
        try {
            let chars = "0123456789";
            let codigo = "";
            while(codigo.length < 6) {
                codigo += chars.substr(parseInt(Math.random() * chars.length), 1);
            }
            let html = `
                <p>
                    Se ha solicitado un código para cambio de contraseña para ZRepo para esta dirección de correo.
                    Para completar el cambio de contraseña, por favor pegue el siguiente código en el sistema:
                </p>
                <h4>${codigo}</h4>
                <hr />
                <p><small>Este es un correo automático, por favor no responder</small></p>
            `;            
            let updateDoc = {$set:{creationCode:codigo}};
            let col = await mongo.collection("users");
            await col.updateOne({_id:email}, updateDoc);
            console.log("Enviando código:", codigo);
            await this._sendMail(email, "Código para Cambio de Contraseña", html);
        } catch (error) {
            throw error;
        }
    }

    _sendMail(to, subject, html) {
        try {
            let parameters = config.config.smtp;;
            if (!this._transport) {
                if (!parameters) throw "No se ha configurado el servidor SMTP";
                this._transport = nodemailer.createTransport(parameters);
            }
            return new Promise((resolve, reject) => {
                let message = {
                    from: parameters.from,
                    subject: subject,
                    to: to,
                    text: null,
                    html: html
                }
                this._transport.sendMail(message, (err, info) => {
                    if (err) reject(err);
                    resolve(info);
                });
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async cambiarPwd(email, codigo, pwd) {
        try {
            let col = await mongo.collection("users");
            let doc = await col.findOne({_id:email});
            if (!doc) throw "Usuario inválido";
            if (doc.creationCode != codigo) throw "El código de creación de contraseña es inválido";
            let pwdHash = await this._encript(pwd);
            await col.updateOne({_id:email}, {$set:{creationCode:null, pwd:pwdHash}});
        } catch (error) {
            throw error;
        }
    }

    async cambiarMiPwd(authToken, pwdActual, pwdNueva) {
        try {
            let sesion = await this._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";

            let col = await mongo.collection("users");
            let u = await col.findOne({_id:sesion.email});
            if (!u) throw "Usuario inválido";
            const pwdValida = await this._compareWithEncripted(pwdActual, u.pwd);
            if (!pwdValida) throw "Contraseña Actual Inválida";            
            let pwdHash = await this._encript(pwdNueva);
            await col.updateOne({_id:sesion.email}, {$set:{creationCode:null, pwd:pwdHash}});
        } catch (error) {
            throw error;
        }
    }

    getConfig() {
        try {
            let c = JSON.parse(JSON.stringify(config.config));
            delete c.adminLogin;
            delete c.adminPassword;
            delete c.masterToken;
            delete c.mqtt;
            delete c.smtp;
            delete c.tokens;
            delete c.plugins;
            return c;
        } catch (error) {
            throw error;
        }
    }
        

    // Dimensions
    getRowsCount(dimCode, textFilter, filter) {
        return dimensions.getRowsCount(dimCode, textFilter, filter);
    }
    getRows(dimCode, textFilter, filter, startRow, nRows) {
        return dimensions.getRows(dimCode, textFilter, filter, startRow, nRows);
    }
    getRow(dimCode, code) {
        return dimensions.getRow(dimCode, code);
    }
    getRowWithDependencies(dimCode, code) {
        return dimensions.getRowWithDependencies(dimCode, code);
    }
    addDimRow(dimCode, row) {
        return dimensions.addRow(dimCode, row);
    }
    saveDimRow(dimCode, row) {
        return dimensions.saveRow(dimCode, row);
    }
    deleteDimRow(dimCode, code) {
        return dimensions.deleteRow(dimCode, code);
    }
    syncDimension(dimCode) {
        return dimensions.syncDimension(dimCode);
    }
    importDimensionRows(dimCode, rows) {
        return dimensions.importRows(dimCode, rows);
    }
    dimMoveUp(dimCode, textFilter, filter, rowCode) {
        return dimensions.moveUp(dimCode, textFilter, filter, rowCode);
    }
    dimMoveDown(dimCode, textFilter, filter, rowCode) {
        return dimensions.moveDown(dimCode, textFilter, filter, rowCode);
    }

    // DataSets
    getDSRowsCount(dsCode, fromTime, toTime, filter) {
        return dataSets.getRowsCount(dsCode, fromTime, toTime, filter);
    }
    getDSRows(startRow, nRows, dsCode, fromTime, toTime, filter) {
        return dataSets.getRows(startRow, nRows, dsCode, fromTime, toTime, filter);
    }
    importDSBatch(dsCode, rows) {
        return dataSets.importBatch(dsCode, rows);
    }
    importDSRow(dsCode, row) {
        return dataSets.importRow(dsCode, row);
    }
    syncDataSet(dsCode, importIndex) {
        return dataSets.syncDataSet(dsCode, importIndex);
    }
}

module.exports = Portal.instance;