class LogDetails extends ZCustomController {
    async onThis_init(x) {
        let details = await zPost("getLogLine.zrepo", {instanceId:x.instanceId, index:x.index});
        this.edDetails.value = details.text;
    }
}
ZVC.export(LogDetails);