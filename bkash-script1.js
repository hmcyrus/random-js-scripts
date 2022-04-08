const WALLET_REGEX = /^01\d{9}$/;
const OTP_REGEX = /^\d{6}$/;
const PIN_REGEX = /^\d{4,5}$/;
const DIGITS_REGEX = /^[0-9]+$/;
const INTERNAL_BASE_URL = "/getBaseUrl";

const VALIDATE_HASH_URL = "/validateHashTokenized";
const VALIDATE_WALLET_URL = "/validateWalletTokenized";
const RESEND_OTP_URL = "/resendOtpTokenized";
const VALIDATE_OTP_URL = "/validateOTPTokenized";
const VALIDATE_PIN_URL = "/validatePINTokenized";

const SUCCESSFUL_CODE = "0000";
const MULTIPLE_WINDOW_CODE = "2059";
const RESEND_OTP_COUNT_EXCEED_CODE = "2013";
const WRONG_OTP_CODE = "2016";
const WRONG_OTP_COUNT_EXCEEDED_CODE = "2017";
const OTP_VERIFICATION_TIME_EXCEEDED_CODE = "2018";
const WRONG_PIN_CODE = "2014";
const WRONG_PIN_COUNT_EXCEEDED_CODE = "2015";
function getParamsFromUrl() {
    let url = window.location.href;
    let currentUrl = new URL(url);

    let paymentID = currentUrl.searchParams.get('paymentID');
    let hash = currentUrl.searchParams.get('hash');
    let apiVersion = currentUrl.searchParams.get('apiVersion');
    let mode = currentUrl.searchParams.get('mode');

    return {paymentID, hash, apiVersion, mode};
}

async function validateHashUrl() {

    try {
        let hashValidationPayload = getParamsFromUrl();

        let {data: {baseUrl}} = await axios.post(INTERNAL_BASE_URL);

        if (!baseUrl) {
            throw new Error("baseUrl is null or empty");
        }

        let response = await axios.post(baseUrl + VALIDATE_HASH_URL, hashValidationPayload);

        response.data.baseURL = baseUrl;

        return response;
    } catch (e) {
        console.error("Failed to validate hash url", e);
        throw e;
    }
}
const app = new Vue({
    el: '#tokenized-0011',
    data: {
        errorPageURL: "/tokenized-error",

        lastWindow: "",
        showWallet: false,
        showOTP: false,
        showResendOTP: true,
        showPIN: false,
        showCancel: false,

        message: "Please wait",

        genericErrorMessage: "Invalid Request",
        internalErrorMessage: "Internal Error",

        merchantImageSrc: "",
        organizationName: "n/a",
        invoiceNumber: "n/a",
        amount: 0,

        baseURL: "",
        successURL: "",
        failureURL: "",
        cancelURL: "",

        isProcessing: false,
        footer: "<b>Helpline</b>: 16247. <b>Version</b>: 1.2.0-beta",
        wallet: "",
        paymentID: "",

        apiVersion: "v1.2.0-beta",
        encKey: "",
        rsaKey: "",
        nonce: "",
    },
    computed: {
        validateWalletURL() {
            if (this.baseURL) {
                return this.baseURL + VALIDATE_WALLET_URL;
            }
        },
        resendOtpURL() {
            if (this.baseURL) {
                return this.baseURL + RESEND_OTP_URL;
            }
        },
        validateOtpURL() {
            if (this.baseURL) {
                return this.baseURL + VALIDATE_OTP_URL;
            }
        },
        validatePinURL() {
            if (this.baseURL) {
                return this.baseURL + VALIDATE_PIN_URL;
            }
        }
    },
    methods: {
        showCancelModal(calledFrom) {
            this.lastWindow = calledFrom;
            switch (calledFrom) {
                case "wallet":
                    this.showWallet = false;
                    break;
                case "otp":
                    this.showOTP = false;
                    break;
                case "pin":
                    this.showPIN = false;
            }
            this.showCancel = true;
        },
        hideCancelModal() {
            switch (this.lastWindow) {
                case "wallet":
                    this.showWallet = true;
                    break;
                case "otp":
                    this.showOTP = true;
                    break;
                case "pin":
                    this.showPIN = true;
                    break;
            }
            this.showCancel = false;
        },
        showOTPValidation() {
            this.showWallet = false;
            this.showPIN = false;
            this.showOTP = true;
        },
        showConfirmPin(keys) {
            this.encKey = keys.aesKey;
            this.rsaKey = keys.rsaPublicKey;
            this.nonce = keys.pinNonce;

            this.showOTP = false;
            this.showPIN = true;
        },
        cancelPayment: function () {
            this.showCancel = false;
            this.isProcessing = true;
            this.initTimerRedirectToMerchant('cancel')();
        },
        paymentFailed() {
            this.showWallet = false;
            this.showOTP = false;
            this.showPIN = false;
            this.isProcessing = true;
            this.initTimerRedirectToMerchant('failure')();
        },
        paymentSuccessful() {
            this.showPIN = false;
            this.isProcessing = true;
            this.initTimerRedirectToMerchant('success')();
        },
        initTimerRedirectToMerchant: function (status) {

            let count = 5;
            let self = this;

            return function inner() {

                if (count > -1) {
                    if (status === 'cancel') {
                        self.message = "Payment process cancelled<br>Redirecting to <a href='" + self.cancelURL + "&apiVersion=1.2.0-beta'>Merchant Website</a> in " + count + "s";
                    } else if (status === 'failure') {
                        self.message = "Payment process failed<br>Redirecting to <a href='" + self.failureURL + "&apiVersion=1.2.0-beta'>Merchant Website</a> in " + count + "s";
                    } else if (status === 'success') {
                        self.message = "bKash Account verification successful<br>Redirecting to <a href='" + self.successURL + "&apiVersion=1.2.0-beta'>Merchant Website</a> in " + count + "s";
                    }
                    count--;
                    setTimeout(inner, 1000);
                } else {
                    if (status === 'cancel') {
                        window.location.href = self.cancelURL + "&apiVersion=1.2.0-beta";
                    } else if (status === 'failure') {
                        window.location.href = self.failureURL + "&apiVersion=1.2.0-beta";
                    } else if (status === 'success') {
                        window.location.href = self.successURL + "&apiVersion=1.2.0-beta";
                    }
                }
            };

        },
    },
    mounted() {
        this.isProcessing = true;

        validateHashUrl()
            .then((response) => {

                if (response && response.data.statusCode === SUCCESSFUL_CODE) {
                    this.isProcessing = false;
                    this.message = "";
                    this.showWallet = true;

                    this.baseURL = response.data.baseURL;
                    this.paymentID = response.data.paymentID;

                    this.merchantImageSrc = response.data.orgLogo;
                    this.organizationName = response.data.orgName;

                    this.invoiceNumber = response.data.merchantInvoiceNumber;
                    this.amount = response.data.amount;

                    this.successURL = response.data.successCallbackURL;
                    this.failureURL = response.data.failureCallbackURL;
                    this.cancelURL = response.data.cancelCallbackURL;

                    //pre-populating wallet
                    if (response.data.wallet && WALLET_REGEX.test(response.data.wallet)) {
                        this.wallet = response.data.wallet;
                    }
                } else {
                    window.location.href = 'tokenized-error';
                }
            })
            .catch(error => {
                window.location.href = "tokenized-error";
            });
    }
});
Vue.component('cancel-modal', {
    template: `<div>
    <div id="inputHolder">
        <div class="infoText">
            <h4 id="title" align="left">
                <slot name="header"></slot>
            </h4>
            <p id="details">
                <slot name="body"></slot>
            </p>
        </div>
    </div>
    <div class="buttonAction">
        <button id="close_button" @click="$emit('exit')">YES</button>
        <button id="confirm_button" @click="$emit('close-modal')">NO</button>
    </div>
</div>`
});
Vue.component('feedback', {
    template: `<div>
    <div id="loaderHolder" class="feedback-message verticalCenter">
    <slot></slot>
</div>
    <loader></loader>
</div>`
})
Vue.component('footer-layout', {
    template: `<div id="footerItem">
    <div id='credit'>
        <img src="/assets/images/dial_icon.png" height='25px' width='25px'>
        <b id=dialText>16247</b>
    </div>
</div>`,
});

Vue.component('header-layout', {
    template: `<div class="header verticalCenter">
    <div class="logo">
        <img src="/assets/images/bkash_payment_logo.png" alt="bKash">
    </div>
</div>`,
});
Vue.component('loader', {
    template: `<div class="loader">
    <img src="/assets/images/processing_gif.svg" alt="">
</div>
`
});

Vue.component('payment-info', {
    props: ['orgSrc', 'merchantImageSrc', 'invoiceNumber', 'amount'],
    computed: {
        invoiceNumberFirstHalf() {
            if (this.$props.invoiceNumber && this.$props.invoiceNumber.length > 20) {
                return this.$props.invoiceNumber.substring(0, 21);
            } else {
                return this.$props.invoiceNumber;
            }
        },
        invoiceNumberSecondHalf() {
            if (this.$props.invoiceNumber && this.$props.invoiceNumber.length > 20) {
                return this.$props.invoiceNumber.substring(20, this.$props.invoiceNumber.length);
            }
        },
        amountBig() {
            if (this.$props.amount && this.$props.amount.length <= 5) return true;
            else return false

        },
        amountMed() {
            if (this.$props.amount && (this.$props.amount.length === 6 || this.$props.amount.length === 7)) return true;
            else return false
        },
        amountSmall() {
            if (this.$props.amount && (this.$props.amount.length >= 8)) return true;
            else return false
        }
    },
    template: `<div class="top verticalCenter">
        <div class="payment-box">
            <div class="flex-logo">
                <div class="avatar">
                    <img v-if="merchantImageSrc" :src="merchantImageSrc" alt="avatar">
                </div>
            </div>
            <div class="flex-merchant details">
                <h4 :style="invoiceNumber ? '' : 'margin: auto'">{{ orgSrc }}</h4>
                <div v-if="invoiceNumber">
                    <p style="margin: 0px">Invoice:{{invoiceNumberFirstHalf}}</p>
                </div>
                <p class="p1">{{invoiceNumberSecondHalf}}</p>
            </div>
            <div class="flex-amount">
                <div v-if="amountBig">
                    <div class=amount>
                        <b1>৳</b1>
                        <b1>{{amount}}</b1>
                    </div>
                </div>
                <div v-if="amountMed">
                    <div class=amount>
                        <b>৳</b>
                        <b>{{amount}}</b>
                    </div>
                </div>
                <div v-if="amountSmall">
                    <div class=amount>
                        <b2 style="margin-right: 3px">৳</b2>
                        <b2>{{amount}}</b2>
                    </div>
                </div>

            </div>
        </div>
</div>`,
});
Vue.component('input-action', {
    props: ['confirmButtonText', 'isProcessing'],
    methods: {
        onClose() {
            if (!this.$props.isProcessing) {
                this.$emit('on-close', 'on close');
            }
        },
        onConfirm() {
            if (!this.$props.isProcessing) {
                this.$emit('on-confirm', 'on confirm');
            }
        }
    },
    template: `<div>
    <loader v-if="isProcessing"></loader>
    <div class="buttonAction" v-else>
        <button type="button" id="close_button"
                :class="{ processing: isProcessing }"
                @click="onClose()">CLOSE
        </button>
        <button type="button" id="confirm_button"
                :class="{ processing: isProcessing }"
                @click="onConfirm()">CONFIRM
        </button>
    </div>

</div>`
});
Vue.component('numeric-input', {
    props: ['placeholder', 'value', 'maxlength', 'type', 'disabled'],
    template: `<input
        id="ash"
        ref="input"
        v-bind:type="type === 'password' ? 'password' : 'text'"
        class="form-control"
        pattern="[0-9]*"
        inputmode="numeric"
        v-bind:placeholder="placeholder || 'numeric input only'"
        v-bind:maxlength="maxlength || '524288'"
        v-bind:autocomplete="type === 'password' ? 'one-time-code' : 'off'"
        v-model="value"
        @keypress="numbersOnly(event)"
        @change="change(event)"
        v-on:keydown.delete="$emit('backspace')"
        v-on:keydown.enter="$emit('on-enter')"
        :disabled="disabled"
        @paste="onPaste"
        required
/>`,
    watch: {
        value(input) {
            this.$emit('input', input);
        }
    },
    methods: {
        numbersOnly(event) {
            let inputKey = event.key;

            let isNotNumber = !DIGITS_REGEX.test(inputKey);

            if (isNotNumber) event.preventDefault();
        },
        change(event) {
            let value = event.target.value;

            if (!DIGITS_REGEX.test(value)) {
                this.$props.value = '';
                this.$emit('input', '');
            }
        },
        onPaste(event) {
            if (this.$props.type === 'password') {
                event.preventDefault();
            } else {
                let pastedValue = (event.clipboardData || window.clipboardData).getData('text');

                if (!DIGITS_REGEX.test(pastedValue)) {
                    event.preventDefault();
                }
            }
        },
    },
    mounted() {
        this.$refs.input.focus();
    }
});
Vue.component('otp-input', {
    props: [
        'validateOtpUrl',
        'resendOtpUrl',
        'wallet',
        'paymentId',
        'apiVersion',
    ],
    template: `<div>
    <div id="inputHolder">
        <label for='otp' class='infoText'>Enter verification code sent to {{ maskedWallet }}</label>
        <numeric-input placeholder="bKash Verification Code"
                       maxlength="6"
                       :value="otp"
                       v-on:input="(val) => this.otp = val"
                       v-on:backspace="() => this.otp = ''"
                       v-on:on-enter="confirmOTP"
                       :disabled="isActionInProgress"
        ></numeric-input>

        <span class="help-inline text-white" v-html="message"></span>

        <span v-if="canResendOTP" class="infoText">Didn't receive code? 
            <b @click="resendOTP()" class="textButton" :style="isActionInProgress ? { cursor: 'not-allowed' } : ''">
                <u>Resend code</u>
            </b>
        </span>
    </div>

    <input-action
            v-on:on-close="$emit('close', 'otp')"
            v-on:on-confirm="confirmOTP"
            :is-processing="isActionInProgress"
            confirm-button-text="Confirm"
    ></input-action>
</div>`,
    data() {
        return {
            otp: "",
            isActionInProgress: false,
            message: "",
            canResendOTP: true,

            codeSuccessfulSentMessage: "Code sent successfully",
            sendingCodeMessage: "Sending code to user handset ..",
            genericErrorMessage: "Invalid Request",
            internalErrorMessage: "Internal Error",
            invalidVerificationMessage: "Put a valid verification code"
        };
    },
    computed: {
        maskedWallet() {
            let wallet = this.$props.wallet;
            if (wallet.length === 11) {
                let firstHalf = wallet.substring(0, 3);
                let lastHalf = wallet.substring(8);

                return firstHalf + " ** *** " + lastHalf;
            }
        },
    },
    methods: {
        async confirmOTP() {
            this.isActionInProgress = true;
            this.message = "";

            if (OTP_REGEX.test(this.otp)) {
                await axios.post(this.$props.validateOtpUrl, {
                    otp: this.otp,
                    wallet: this.$props.wallet,
                    paymentID: this.$props.paymentId,
                    apiVersion: this.$props.apiVersion
                }).then(response => {
                    if (response && response.data.statusCode === SUCCESSFUL_CODE) {
                        this.message = "";
                        this.canResendOTP = false;

                        let keys = {};
                        keys.aesKey = response.data.aesKey;
                        keys.rsaPublicKey = response.data.rsaPublicKey;
                        keys.pinNonce = response.data.pinNonce;

                        this.$emit('otp-success', keys);
                    } else if (response && response.data.statusMessage
                        && response.data.statusCode === WRONG_OTP_CODE) {

                        // wrong otp
                        this.message = response.data.statusMessage;

                    } else if (response && response.data.statusMessage
                        && response.data.statusCode === WRONG_OTP_COUNT_EXCEEDED_CODE) {

                        // too many wrong otp attempt
                        this.message = response.data.statusMessage;
                        this.canResendOTP = false;

                        this.$emit('otp-fail');
                    } else if (response && response.data.statusMessage
                        && response.data.statusCode === OTP_VERIFICATION_TIME_EXCEEDED_CODE) {

                        // otp verification code exceeded
                        this.message = response.data.statusMessage;

                        if (!this.canResendOTP) {
                            this.$emit('otp-fail');
                        }
                    } else {
                        // unknown otp response
                        if (response && response.data.statusMessage) {
                            this.message = response.data.statusMessage;
                        } else {
                            this.message = this.genericErrorMessage;
                        }
                        this.$emit('otp-fail')
                    }
                }).catch(() => {
                    this.message = this.internalErrorMessage;
                });
            } else {
                this.message = this.invalidVerificationMessage;
            }

            this.isActionInProgress = false;
        },
        async resendOTP() {

            if (this.isActionInProgress) return;

            this.isActionInProgress = true;
            this.otp = "";
            this.message = this.sendingCodeMessage;

            await axios.post(this.$props.resendOtpUrl, {
                wallet: this.$props.wallet,
                paymentID: this.$props.paymentId,
                apiVersion: this.$props.apiVersion
            }).then(response => {
                if (response && response.data.statusCode === SUCCESSFUL_CODE) {
                    this.message = this.codeSuccessfulSentMessage;
                } else {
                    this.canResendOTP = false;
                    if (response && response.data.statusMessage) {
                        this.message = response.data.statusMessage;
                    } else {
                        this.message = this.genericErrorMessage;
                    }
                }
            }).catch(() => {
                this.message = this.internalErrorMessage;
            });

            this.isActionInProgress = false;
        }
    }
});



Vue.component('pin-input', {
    props: ['aesKey', 'wallet', 'rsaPublicKey', 'pinNonce', 'validatePinUrl', 'paymentId', 'apiVersion'],
    template: `<div>
    <div id="inputHolder">
        <label for='password' class='infoText'>Enter PIN of your bKash Account number ({{ maskedWallet }})</label>
        <numeric-input type="password"
                placeholder='Enter PIN'
                maxlength="5"
                :value="pin"
                v-on:input="(val) => this.pin = val"
                v-on:backspace="() => this.pin = ''"
                v-on:on-enter="confirmPIN"
                style="margin-bottom: 23px"
                :disabled="isActionInProgress"
        ></numeric-input>

       <span class="help-inline text-white" v-html="message"></span>
    </div>

    <input-action
            v-on:on-close="$emit('close', 'pin')"
            v-on:on-confirm="confirmPIN"
            :is-processing="isActionInProgress"
            confirm-button-text="Confirm"
    ></input-action>
</div>`,
    data() {
        return {
            isActionInProgress: false,
            pin: "",
            message: "",
            invalidPinRegexMessage: "Invalid PIN",
            genericErrorMessage: "Invalid Request",
            internalErrorMessage: "Internal Error",
        }
    },
    computed: {
        maskedWallet() {
            let wallet = this.$props.wallet;
            if (wallet.length === 11) {
                let firstHalf = wallet.substring(0, 3);
                let lastHalf = wallet.substring(8);

                return firstHalf + " ** *** " + lastHalf;
            }
        }
    },
    methods: {
        async confirmPIN() {
            this.isActionInProgress = true;
            this.message = "";

            if (PIN_REGEX.test(this.pin)) {
                let encryptedPin = encrypt(this.pin, this.$props.aesKey, this.$props.rsaPublicKey);

                await axios.post(this.$props.validatePinUrl, {
                    pin: encryptedPin,
                    nonce: this.$props.pinNonce,
                    paymentID: this.$props.paymentId,
                    apiVersion: this.$props.apiVersion
                }).then(response => {
                    if (response && response.data.statusCode === SUCCESSFUL_CODE) {

                        this.$emit('pin-success');

                    } else if (response && response.data.statusMessage
                        && response.data.statusCode === WRONG_PIN_CODE) {

                        // wrong pin code
                        this.message = response.data.statusMessage;

                        this.$props.pinNonce = response.data.pinNonce;
                        this.$props.aesKey = response.data.aesKey;
                        this.$props.rsaPublicKey = response.data.rsaPublicKey;

                    } else if (response && response.data.statusMessage
                        && response.data.statusCode === WRONG_PIN_COUNT_EXCEEDED_CODE) {

                        // too many wrong pin code attempt
                        this.message = response.data.statusMessage;
                        this.$emit('pin-fail');

                    } else {

                        if (response && response.data.statusMessage) {
                            this.message = response.data.statusMessage;
                        } else {
                            this.message = this.genericErrorMessage;
                        }

                        this.$emit('pin-fail');
                    }
                }).catch(() => {
                    this.message = this.internalErrorMessage;
                    // this.$emit('pin-fail');
                });
            } else {
                this.message = this.invalidPinRegexMessage;
            }

            this.pin = "";
            this.isActionInProgress = false;
        },
    }
});
Vue.component('wallet-input', {
    template: `<div>
    <div id="inputHolder">
        <label for='wallet' class='infoText'>Your bKash Account number</label>
        <numeric-input id="wallet" placeholder="e.g 01XXXXXXXXX"
                       maxlength="11"
                       :value="wallet"
                       v-on:input="emitWalletChange"
                       v-on:on-enter="validateWallet"
                       :disabled="isActionInProgress"
        ></numeric-input>

        <span class="help-inline text-white" v-html="message"></span>

        <span class="infoText">By clicking on <span class="confirmText">Confirm</span>, you are agreeing to the <b
                class="textButton"><a
                href='https://www.bkash.com/tokenized_checkout' target='_blank'>terms & conditions</a></b> </span>
    </div>

    <input-action
            v-on:on-close="$emit('close', 'wallet')"
            v-on:on-confirm="validateWallet"
            :is-processing="isProcessing"
            confirm-button-text="Confirm"
    ></input-action>
</div>`,
    props: [
        'walletValidationUrl',
        'resendOtpUrl',
        'wallet',
        'paymentId',
        'apiVersion',
        'isLoading'
    ],
    data() {
        return {
            message: "",
            walletValidationAttemptCount: 0,
            isActionInProgress: false,

            invalidWalletRegexMessage: "Put a valid bKash Account Number",
            internalErrorMessage: "Internal Error",
        }
    },
    computed: {
        isFirstWalletValidationAttempt() {
            return this.walletValidationAttemptCount == 0;
        },
        isProcessing() {
            return this.$props.isLoading || this.isActionInProgress;
        }
    },
    methods: {
        async validateWallet() {
            this.isActionInProgress = true;
            this.message = "";

            let walletNo = this.$props.wallet;
            let paymentID = this.$props.paymentId;
            let apiVersion = this.$props.apiVersion;

            if (WALLET_REGEX.test(walletNo)) {
                if (this.isFirstWalletValidationAttempt) {

                    // validate wallet
                    await axios.post(this.$props.walletValidationUrl, {
                        wallet: walletNo,
                        paymentID: paymentID,
                        apiVersion: apiVersion,
                    }).then(response => {
                        if (response && response.data.statusCode === SUCCESSFUL_CODE) {
                            this.$emit('validation-success');
                        } else {
                            if (response && response.data.statusCode === MULTIPLE_WINDOW_CODE) {
                                window.location.href = "tokenized-error"
                            } else {
                                if (response && response.data.statusMessage) {
                                    this.$props.wallet = "";
                                    this.message = response.data.statusMessage;
                                } else {
                                    this.message = this.internalErrorMessage;
                                }
                            }
                        }
                    }).catch(error => {
                        this.message = this.internalErrorMessage;
                    });
                } else {
                    // send otp
                    await axios.post(this.$props.resendOtpUrl, {
                        wallet: walletNo,
                        paymentID: paymentID,
                        apiVersion: apiVersion,
                    }).then(response => {
                        if (response && response.data.statusCode === SUCCESSFUL_CODE) {
                            this.$emit('validation-success');
                        } else {
                            if (response && response.data.statusCode === RESEND_OTP_COUNT_EXCEED_CODE) {
                                this.$emit('validation-fail');
                            } else {
                                this.$props.wallet = "";
                                this.emitWalletChange("");
                                this.message = response.data.statusMessage;
                            }
                        }
                    }).catch(() => {
                        this.$emit('validation-fail');
                    });
                }
            } else {
                this.message = this.invalidWalletRegexMessage;
            }

            this.walletValidationAttemptCount++;
            this.isActionInProgress = false;
        },
        emitWalletChange(wallet) {
            this.$emit('wallet-change', wallet);
        }
    }
});
