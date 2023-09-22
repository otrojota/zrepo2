const zrepoURL = "";
// const zrepoURL = "http://10.10.4.12:8096";

class Main extends ZCustomController {
    async onThis_init() {
        window.timeZone = moment.tz.guess();
        moment.tz.setDefault(window.timeZone)
        zClientDefaultErrorHandler = msg => this.showDialog("common/WError", {message:msg})
        window.config = await zPost(zrepoURL + (zrepoURL?"/":"") + "getConfig.zrepo");
        window.zrepo = new ZRepo(window.config);
        if (!window.config["public-token"]) console.error("No 'public-token' in zrepo config");
        window.zRepoClient = new ZRepoClient(zrepoURL, window.config["public-token"]);
        await window.zRepoClient.readMetadata();
        let token = window.localStorage.getItem("sesion");
        if (token) {
            try {
                let sesion = await zPost("autoLogin.zrepo", {token});
                window.sesion=sesion;
                window.zSecurityToken = sesion.token;
            } catch(error) {
                token = null;
                console.error(error);
                window.localStorage.removeItem("sesion");
            }
        }
        if (token) {
            this.mainLoader.load("./main/MainMenu")
        } else {
            this.mainLoader.load("./login/Login")
        }        
    }

    onMainLoader_login() {
        this.mainLoader.load("./main/MainMenu")
    }
    onMainLoader_logout() {
        this.mainLoader.load("./login/Login")
    }
}
ZVC.export(Main);