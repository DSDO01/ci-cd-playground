
class Helper {

    static displayFormattedMessage(message) {
        const messageLength = message.length + 4; // Add extra space for padding
        const border = '-'.repeat(messageLength);
        console.log(`${border}\n| ${message} |\n${border}`);
    }

    static displayTriggerScanSuccessMessage() {
        const triggerScanSuccessMessage = "🚀 A security scan has been triggered for this Pull Request. Stay tuned for updates! 🔍";
        this.displayFormattedMessage(triggerScanSuccessMessage);

        return triggerScanSuccessMessage;
    }

    static displayScanSuccessMessage(reportLink) {
        const scanSuccessMessage = `✅ Security scan completed successfully! View the detailed report [here](${reportLink}).`;
        this.displayFormattedMessage(scanSuccessMessage);

        return scanSuccessMessage;
    }

    static displayScanFailureMessage(reportLink) {
        const scanFailureMessage = `❌ Security scan failed. Review the report for more details [here](${reportLink}).`;
        this.displayFormattedMessage(scanFailureMessage);

        return scanFailureMessage;
    }

    static displayScanFinishedMessage() {
        const scanFinishedMessage = "⚠️ Security scan finished, but the result is unknown.";
        this.displayFormattedMessage(scanFinishedMessage);

        return scanFinishedMessage;
    }

    static displayScanResultMessage(result, reportLink) {
        if (result === 'success') {
            return this.displayScanSuccessMessage(reportLink);
        } else if (result === 'failure') {
            return this.displayScanFailureMessage(reportLink);
        } else {
            return this.displayScanFinishedMessage();
        }
    }
}

module.exports = Helper; 
