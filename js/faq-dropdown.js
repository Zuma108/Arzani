document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.faq-dropdown').forEach(item => {
        const answer = item.querySelector('.home-faq_answer');
        answer.style.display = 'none';
        item.addEventListener('click', () => {
            answer.style.display = answer.style.display === 'none' ? 'block' : 'none';
        });
    });
});
