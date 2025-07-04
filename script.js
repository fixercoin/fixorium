 const createWalletForm = document.getElementById('create-wallet-form');
const walletContainer = document.getElementById('wallet-container');
const walletAddressElement = document.getElementById('wallet-address');
const balanceElement = document.getElementById('balance');
const sendBtn = document.getElementById('send-btn');
const receiveBtn = document.getElementById('receive-btn');
const transactionsBtn = document.getElementById('transactions-btn');
const transactionsContainer = document.getElementById('transactions-container');
const transactionsList = document.getElementById('transactions-list');

let web3;
let account;
let wallet;

createWalletForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    wallet = await createWallet(password);
    account = wallet.address;
    web3 = new Web3(window.ethereum);
    walletContainer.style.display = 'block';
    createWalletForm.style.display = 'none';
    walletAddressElement.innerText = account;
    getBalance();
});

sendBtn.addEventListener('click', async () => {
    const recipient = prompt('Enter recipient address');
    const amount = prompt('Enter amount to send');
    await sendTransaction(recipient, amount);
});

receiveBtn.addEventListener('click', () =>
