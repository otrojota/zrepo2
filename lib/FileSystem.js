const ZModule = require("./z-server").ZModule;
const config = require("./Config");
const mongo = require("../minz/MongoDB");
const portal = require("./Portal");

class FileSystem extends ZModule {
    static get instance() {
        if (FileSystem.singleton) return FileSystem.singleton;
        FileSystem.singleton = new FileSystem();
        return FileSystem.singleton;
    }

    agregaAListaGrupos(ret, grupos) {
        for (let g of grupos) {
            ret.push(g.id);
            if (g.items) this.agregaAListaGrupos(ret, g.items);
            else g.items = [];
        }
    }
    buscaGrupo(lista, id) {
        for (let g of lista) {
            if (g.id == id) return g;
            let found = this.buscaGrupo(g.items, id);
            if (found) return found;
        }
        return null;
    }
    async getVisibleGroups(authToken, onlyGroups) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let groups = portal.getConfig()["dashboard-groups"] || [];
            let permisos = await portal.getUserGroupsVisibility(authToken, null);
            groups = groups.filter(g => (permisos[g.id] && (permisos[g.id].query || permisos[g.id].publish)));
            // Agregar dashboards a cada grupo
            let listaGrupos = [];
            this.agregaAListaGrupos(listaGrupos, groups);
            if (!onlyGroups) {
                let col = await mongo.collection("dashboards");
                let dsbs = await col.find({sharedIn:{$in:listaGrupos}}, {projection:{_id:1, name:1, icon:1, sharedIn:1}}).toArray();
                dsbs = dsbs.sort((d1, d2) => (d1.name > d2.name?1:-1));
                for (let d of dsbs) {
                    let g = this.buscaGrupo(groups, d.sharedIn);
                    let item = {id:d._id, name:d.name, icon:d.icon, _type:"dashboard"};
                    if (permisos[g.id].publish) item.editable = true;
                    if (g) g.items.push(item);
                }
            }

            if (!portal._isGlobalAdmin(sesion.email)) {
                groups.splice(0,0,{id:"_fav_", name:"Mis Favoritos", icon:'fa-solid fa-heart', selectable:false, items:true});
                groups.push({id:"_my_", name:"Mis Carpetas", icon:'fa-solid fa-user-gear', _type:"_my_", selectable:true, items:true});
            }
            return groups;
        } catch (error) {
            throw error;
        }
    }

    async canPublish(authToken) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let permisos = await portal.getUserGroupsVisibility(authToken, null);
            let idx = Object.keys(permisos).findIndex(k => permisos[k].publish);
            return idx >= 0;
        } catch (error) {
            throw error;
        }
    }

    async getFavDashboards(authToken) {
        try {
            let {favs} = await portal.getUserFavs(authToken);
            let col = await mongo.collection("dashboards");
            let rows = await col.find({_id:{$in:favs}}, {projection:{_id:1, name:1, icon:1}}).toArray();
            return rows.map(r => ({
                id:r._id, name:r.name, icon:r.icon, _type:"dashboard"
            }));
        } catch (error) {
            throw error;
        }
    }

    _buscaFolder(folders, condicion) {
        for (let f of folders) {
            if (condicion(f)) return f;
            if (f.folders) {
                let found = this._buscaFolder(f.folders, condicion);
                if (found) return found;
            }
        }
        return null;
    }
    _buscaParentFolder(folders, folderId) {        
        for (let f of folders) {
            let childFolders = f.folders || [];
            if (childFolders.findIndex(f => f.id == folderId)) return f;
            let found = this._buscaParentFolder(childFolders, folderId);
            if (found) return found;
        }
        return null;
    }

    async _getUserFolders(authToken) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let col = await mongo.collection("users");
            let u = await col.findOne({_id:sesion.email}, {projection:{_id:1, folders:1}});
            if (!u) throw "No Autorizado";
            return u.folders || [];
        } catch (error) {
            throw error;
        }
    }
    async _setUserFolders(authToken, folders) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let col = await mongo.collection("users");
            await col.updateOne({_id:sesion.email}, {$set:{folders:folders}});
        } catch (error) {
            throw error;
        }
    }

    /*
    async getFolderContent(authToken, parentFolderId) {
        try {            
            let folders = await this._getUserFolders(authToken);
            if (!parentFolderId) return folders;
            let f = this._buscaFolder(folders, f => (f.id == parentFolderId));
            if (!f) throw "No se encontró la carpeta con el id:" + parentFolderId;
            return f.folders || [];
        } catch (error) {
            throw error;
        }
    }
    */

    async addUserFolder(authToken, parentFolderId, newName) {
        try {
            let folders = await this._getUserFolders(authToken);
            let f = {id:portal.generaToken(20), name:newName || "Nueva Carpeta", folders:[], dashboards:[]};
            if (!parentFolderId) {
                folders.push(f);
            } else {
                let parentFolder = this._buscaFolder(folders, f => (f.id == parentFolderId));
                if (!parentFolder) throw "No se encontró la carpeta con el id: " + parentFolderId;
                if (!parentFolder.folders) parentFolder.folders = [];
                parentFolder.folders.push(f);
            }
            await this._setUserFolders(authToken, folders);
            return f;
        } catch (error) {
            throw error;
        }
    }

    async getPrivateFolderContent(authToken, parentFolderId, includeFolders = true, includeDashboards = true) {
        try {
            let ret = {folders:[], dashboards:[]};
            let folders = await this._getUserFolders(authToken);
            if (includeFolders) {
                if (!parentFolderId || parentFolderId == "_my_") {
                    ret.folders = folders.map(f => ({
                        id:f.id, name:f.name, icon:'fa-regular fa-folder-closed', _type:"_private_", selectable:true, items:true
                    }));
                } else {
                    let parentFolder = this._buscaFolder(folders, f => (f.id == parentFolderId));
                    if (!parentFolder) throw "No se encontró la carpeta con el id: " + parentFolderId;
                    ret.folders = (parentFolder.folders || []).map(f => ({
                        id:f.id, name:f.name, icon:'fa-regular fa-folder-closed', _type:"_private_", selectable:true, items:true
                    }));
                }
            }
            if (includeDashboards) {
                if (!parentFolderId || parentFolderId == "_my_") {
                    ret.dashboards = [];
                } else {
                    let parentFolder = this._buscaFolder(folders, f => (f.id == parentFolderId));
                    if (!parentFolder) throw "No se encontró la carpeta con el id: " + parentFolderId;
                    if (!parentFolder.dashboards) parentFolder.dashboards = [];
                    let col = await mongo.collection("dashboards");
                    let rows = await col.find({_id:{$in:parentFolder.dashboards}}).toArray();
                    ret.dashboards = rows.map(r => ({
                        id:r._id, name:r.name, icon:r.icon, _type:"dashboard"
                    }));
                }
            }            
            return ret;
        } catch (error) {
            throw error;
        }
    }

    async deleteUserFolder(authToken, folderId) {
        try {
            let folders = await this._getUserFolders(authToken);
            let idx = folders.findIndex(f => f.id == folderId);
            if (idx >= 0) {
                folders.splice(idx,1);
                await this._setUserFolders(authToken, folders);
                return;
            }
            let parentFolder = this._buscaParentFolder(folders, folderId);
            idx = parentFolder.folders.findIndex(f => f.id == folderId);
            parentFolder.folders.splice(idx, 1);
            await this._setUserFolders(authToken, folders);
        } catch (error) {
            throw error;
        }
    }

    async renameUserFolder(authToken, folderId, newName) {
        try {
            let folders = await this._getUserFolders(authToken);
            let f = this._buscaFolder(folders, f => f.id == folderId);
            if (!f) throw "No se encontró la Carpeta con id " + folderId;
            f.name = newName;
            await this._setUserFolders(authToken, folders);
        } catch (error) {
            throw error;
        }
    }

    async addDashboard(authToken, folderId, newName) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";

            let folders = await this._getUserFolders(authToken);
            let f = this._buscaFolder(folders, f => (f.id == folderId));
            if (!f) throw "No se encontró la carpeta con el id: " + folderId;
            if (!f.dashboards) f.dashboards = [];
            let d = {_id:portal.generaToken(40), name:newName || "Nuevo Dashboard", icon:"fas fa-gauge", owner:sesion.email, config:{
                temporality:"5m", layout:{id:"_root_layout", type:"row", size:3, components:[], widths:["33%","33%","33%"]}
            }};
            f.dashboards.push(d._id);
            await this._setUserFolders(authToken, folders);

            let col = await mongo.collection("dashboards");
            await col.insertOne(d);
            d.id = d._id;
            delete d._id;
            return d;
        } catch (error) {
            throw error;
        }
    }

    async importDashboard(authToken, folderId, dashboard) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";

            let folders = await this._getUserFolders(authToken);
            let f = this._buscaFolder(folders, f => (f.id == folderId));
            if (!f) throw "No se encontró la carpeta con el id: " + folderId;
            if (!f.dashboards) f.dashboards = [];
            delete dashboard.id;
            dashboard._id = portal.generaToken(40);
            dashboard.owner = sesion.email;
            f.dashboards.push(dashboard._id);
            await this._setUserFolders(authToken, folders);

            let col = await mongo.collection("dashboards");
            await col.insertOne(dashboard);
            dashboard.id = dashboard._id;
            delete dashboard._id;
            return dashboard;
        } catch (error) {
            throw error;
        }
    }

    buscaGrupo(grupos, id) {
        for (let g of grupos) {
            if (g.id == id) return g;
            let found = this.buscaGrupo(g.items || [], id);
            if (found) return found;
        }
        return null;
    }
    async getDashboard(authToken, id) {
        try {
            let col = await mongo.collection("dashboards");
            let d = await col.findOne({_id:id});
            if (!d) throw "No se encontró el dashboard"
            d.id = d._id;
            delete d._id;
            if (!d.config) d.config = {};
            if (!d.config.temporality) d.config.temporality = "5m";
            if (!d.config.layout) d.config.layout = {id:"_root_layout", type:"row", size:3, components:[], widths:["33%","33%","33%"]}
            if (!d.config.layout.id) d.config.layout.id = "_root_layout";
            if (!d.config.layout.components) d.config.layout.components = [];
            if (!d.config.layout.widths) d.config.layout.widths = [];
            if (d.sharedIn) {
                let groups = portal.getConfig()["dashboard-groups"] || [];
                let g = this.buscaGrupo(groups, d.sharedIn);
                if (g) d.sharedInName = g.name;
            }
            return d;
        } catch (error) {
            throw error;
        }
    }

    async saveDashboard(authToken, dashboard) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            dashboard.editor = sesion.email;
            let col = await mongo.collection("dashboards");
            dashboard._id = dashboard.id;
            delete dashboard.id;            
            await col.replaceOne({_id:dashboard._id}, dashboard);
            return (await this.getDashboard(authToken, dashboard._id));
        } catch (error) {
            throw error;
        }
    }

    async shareDashboard(authToken, dashboardId, groupId) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";
            let col = await mongo.collection("dashboards");
            await col.updateOne({_id:dashboardId}, {$set:{sharedIn:groupId}});
        } catch (error) {
            throw error;
        }
    }

    async deleteDashboard(authToken, id) {
        try {
            let sesion = await portal._getUserSession(authToken);
            if (!sesion) throw "No Autorizado";

            // Eliminar de mis folders
            let folders = await this._getUserFolders(authToken);
            for (let f of folders) {
                if (!f.dashboards) f.dashboards = [];
                let idx = f.dashboards.findIndex(dsbId => dsbId ==id);
                if (idx >= 0) f.dashboards.splice(idx,1);
            }
            await this._setUserFolders(authToken, folders);

            let dsb = await this.getDashboard(authToken, id);
            if (dsb && dsb.owner != sesion.email && !sesion.isAdmin) throw "No Autorizado";

            let col = await mongo.collection("dashboards");
            await col.deleteOne({_id:id});
        } catch (error) {
            throw error;
        }
    }
}

module.exports = FileSystem.instance;