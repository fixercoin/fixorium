let balance = 0;
let transactionHistory = [];

$(document).ready(function() {
    $('#depositBtn').click(function() {
        const amount = parseFloat($('#depositAmount').val());
        if (amount > 0) {
            balance += amount;
            transactionHistory.push(`Deposited: ${amount} FIXER`);
            updateBalance();
            $('#depositAmount').val('');
        }
    });

    $('#withdrawBtn').click(function() {
        const amount = parseFloat($('#withdrawAmount').val());
        if (amount > 0 && amount <= balance) {
            balance -= amount;
            transactionHistory.push(`Withdrew: ${amount} FIXER`);
            updateBalance();
            $('#withdrawAmount').val('');
        }
    });

    $('#swapBtn').click(function() {
        const amount = parseFloat($('#swapAmount').val());
        if (amount > 0 && amount <= balance) {
            balance -= amount; // Assuming a 1:1 swap for simplicity
            transactionHistory.push(`Swapped: ${amount} FIXER`);
            updateBalance();
            $('#swapAmount').val('');
        }
    });

    $('#addTokenBtn').click(function() {
        const amount = parseFloat($('#addTokenAmount').val());
        if (amount > 0) {
            transactionHistory.push(`Added Token: ${amount}`);
            $('#addTokenAmount').val('');
        }
    });

    $('#historyBtn').click(function() {
        $('#history').html(transactionHistory.join('<br>'));
    });

    function updateBalance() {
        $('#balanceAmount').text(balance);
    }
});

