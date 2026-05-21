const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');

addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', function(x) {
    if (x.key === 'Enter') {
        addTodo();
    }
});

function addTodo() {
    if (todoInput.value.trim() !== '') {
        const newItem = document.createElement('li');
        newItem.textContent = todoInput.value.trim();
        todoList.appendChild(newItem);
        todoInput.value = '';
    }
}

todoList.addEventListener('click', function(event) {
    if (event.target.nodeName === 'LI') {
        const clickedItem = event.target;
        clickedItem.classList.toggle('completed');
        if(clickedItem.classList.contains('completed')) {
            setTimeout(function() {
            clickedItem.remove();
        }, 3000);
        }
    }
});