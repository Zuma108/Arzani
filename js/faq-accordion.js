document.addEventListener('DOMContentLoaded', () => {
    console.log('FAQ Accordion script loaded');
    const faqItems = document.querySelectorAll('.faq-item');
    console.log('Found FAQ items:', faqItems.length);
    
    faqItems.forEach((item, index) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');
        
        console.log(`FAQ item ${index}:`, { question: !!question, answer: !!answer, icon: !!icon });
        
        if (question && answer && icon) {
            // Initialize all answers as hidden using both Tailwind classes and CSS properties
            answer.classList.add('hidden');
            answer.style.maxHeight = '0';
            answer.style.display = 'none';
            
            question.addEventListener('click', () => {
                console.log(`FAQ item ${index} clicked`);
                // Check if this FAQ item is currently expanded
                const isCurrentlyExpanded = !answer.classList.contains('hidden');
                console.log(`Currently expanded: ${isCurrentlyExpanded}`);
                
                // Close all FAQs first using both Tailwind classes and max-height
                faqItems.forEach((otherItem, otherIndex) => {
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    const otherIcon = otherItem.querySelector('.faq-icon');
                    if (otherAnswer && otherIcon) {
                        otherAnswer.classList.add('hidden');
                        otherAnswer.style.maxHeight = '0';
                        otherAnswer.style.display = 'none';
                        otherIcon.style.transform = 'rotate(0deg)';
                    }
                });
                
                // If the clicked item was NOT expanded, open it
                if (!isCurrentlyExpanded) {
                    console.log(`Opening FAQ item ${index}`);
                    answer.classList.remove('hidden');
                    answer.style.maxHeight = 'none';
                    answer.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    console.log(`FAQ item ${index} was expanded, now closed`);
                }
            });
        }
    });
    
    // Automatically open the first FAQ item using Tailwind classes
    if (faqItems.length > 0) {
        const firstAnswer = faqItems[0].querySelector('.faq-answer');
        const firstIcon = faqItems[0].querySelector('.faq-icon');
        
        if (firstAnswer && firstIcon) {
            console.log('Auto-opening first FAQ item');
            firstAnswer.classList.remove('hidden');
            firstAnswer.style.maxHeight = 'none';
            firstAnswer.style.display = 'block';
            firstIcon.style.transform = 'rotate(180deg)';
        }
    }
});
