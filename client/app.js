$(document).ready(function() {
    fetchBlocks();

    function fetchBlocks() {
        $.get('/api/blocks', function(data) {
            data.forEach(block => {
                $('#block-container').append(`<div>Block #${block.index}: ${block.data}</div>`);
            });
        });
    }
});

