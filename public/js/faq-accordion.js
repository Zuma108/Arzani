document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');
        
        if (question && answer && icon) {
            question.addEventListener('click', () => {
                // Toggle this FAQ item
                const isExpanded = !answer.classList.contains('hidden');
                // Close all FAQs first
                faqItems.forEach(otherItem => {
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    const otherIcon = otherItem.querySelector('.faq-icon');
                    if (otherAnswer && otherIcon) {
                        otherAnswer.classList.add('hidden');
                        otherIcon.style.transform = 'rotate(0deg)';
                    }
                });
                
                // Then toggle the clicked one
                answer.classList.toggle('hidden');
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        }
    });
    
    // Automatically open the first FAQ item
    if (faqItems.length > 0) {
        const firstAnswer = faqItems[0].querySelector('.faq-answer');
        const firstIcon = faqItems[0].querySelector('.faq-icon');
        
        if (firstAnswer && firstIcon) {
            firstAnswer.classList.remove('hidden');
            firstIcon.style.transform = 'rotate(180deg)';
        }
    }
});
