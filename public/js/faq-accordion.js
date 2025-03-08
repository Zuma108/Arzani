document.addEventListener('DOMContentLoaded', function() {
    const accordionItems = document.querySelectorAll('.Horizontalborder');
    
    if (accordionItems.length === 0) {
        console.error('No accordion items found with class .Horizontalborder');
    } else {
        console.log('Found ' + accordionItems.length + ' accordion items');
    }
    
    accordionItems.forEach(item => {
        const header = item.querySelector('.faq-header');
        const content = item.querySelector('.faq-content');
        const svg = header.querySelector('.Svg');
        
        // Initial state - hide content
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
        content.style.overflow = 'hidden';
        
        header.addEventListener('click', () => {
            // Toggle active class
            item.classList.toggle('active');
            
            // If item is active, expand content and rotate icon
            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + 'px';
                content.style.opacity = '1';
                if (svg) svg.style.transform = 'rotate(180deg)';
            } else {
                // Otherwise collapse content and reset icon
                content.style.maxHeight = '0px';
                content.style.opacity = '0';
                if (svg) svg.style.transform = 'rotate(0deg)';
            }
        });
    });
});
