class ExecutionDetails extends ZCustomController {
    async onThis_init(x) {
        let details = await zPost("getExecutionDetails.zrepo", {instanceId:x._id});
        this.edCreator.value = details.creator;
        this.edParams.value = JSON.stringify(details.params, null, 4);
    }
}
ZVC.export(ExecutionDetails);