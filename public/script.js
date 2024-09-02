// Initialize Firestore database
const db = firebase.firestore();

let todoRef;
// Reference to the 'TodoList' collection in Firestore
todoRef = db.collection('TodoList');

let unsubscribe; // Variable to hold the unsubscribe function for Firestore listener
var count = 0; // Counter to track the number of todo items

// DOM elements references
const nItems = document.getElementById("nItems");
const input = document.getElementById("newTodo");
const todoList = document.getElementById("todoList");
const body = document.body;

const btnAc = document.querySelectorAll(".btn-active");
const btnAll = document.querySelectorAll(".btn-all");
const btnCom = document.querySelectorAll(".btn-completed");
const btnCl = document.getElementById("btn-clear");
var checked = document.querySelector('.btn-check');
const btnTheme = document.getElementById("btn-theme");

let listItems;
const ul = document.getElementById("todoList");
const li = document.querySelectorAll("li");
const icon = document.getElementById("img-theme");
const containerNew = document.getElementById("containerNewTodo");
const containerList = document.getElementById("containerList");


// Function to set a cookie with name, value, and expiration days
function setCookie(cname, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = "expires=" + date.toUTCString();
    document.cookie = `${cname}=${value}; ${expires}; path=/`

}

// Function to get a cookie value by name
function getCookie(cname) {
    const cDecoded = decodeURIComponent(document.cookie);
    const cArray = cDecoded.split("; ");
    var result = null;

    cArray.forEach(e => {
        if (e.indexOf(cname) == 0) {
            result = e.substring(cname.length + 1);
        }
    })

    return result;
}

// Function to generate a unique UUID
function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

// Function to set the order for new items based on the last item's order
function setOrder(){
    return lastItem().then(lastItemData => {
        if (lastItemData) {
            return lastItemData.order + 1;
        } else {
            return 1;
        }
    }).catch(error => {
        console.error("Failed to retrieve the last document:", error);
        return undefined;
    });

}

// Function to set a unique UUID cookie if not already set
function newUuid() {
    if (getCookie("uuidv4") == null) {
        setCookie("uuidv4", uuidv4(), 365);
    }
}

// Immediately invoked function to apply the saved theme (if any)
(function applyTheme() {
    const theme = getCookie('theme');
    if (theme === 'dark') {
        body.classList.add('dark-mode');
    }
})();

// Event listener for checkbox click to toggle the checked state and mark the input
checked.addEventListener('click', () => {
    checked.classList.toggle('checked');
    input.classList.toggle('marked');
});

// Function to toggle dark mode and set the appropriate theme cookie
function toggleDarkMode(){
    body.classList.toggle('dark-mode');

    if(body.classList.contains('dark-mode')){
        setCookie("theme", "dark", 365)
    } else{
        setCookie("theme", "light", 365)
    }
}

// Event listener for the theme toggle button
btnTheme.addEventListener('click', toggleDarkMode);

// Function to update the item count display
function itemCount(count){
    if(count === 1){
        nItems.textContent = "1 item";
    }else{
        nItems.textContent = `${count} items`;
    }
}


// Function to filter todo items based on selected filter button
function filters() {

    let items;

    if (Array.from(btnAll).some(btn => btn.classList.contains("btn-blue"))) {
        items = document.querySelectorAll("li");
    } else if (Array.from(btnAc).some(btn => btn.classList.contains("btn-blue"))) {
        items = document.querySelectorAll("li:not(.marked)");
    } else if (Array.from(btnCom).some(btn => btn.classList.contains("btn-blue"))) {
        items = document.querySelectorAll("li.marked");
    }

    if(items){
        count = items.length;
        itemCount(count);
    }
};

// Event listener for 'Enter' key to add a new todo item
body.addEventListener("keydown", async function (e) {
    if (e.key === "Enter") {
        if (input.value.trim().length === 0) {
            alert("Empty");
        } else {
            let statem = "unmarked";
            if(input.classList.item(1) != null){
                statem = "marked";
            }
            const { serverTimestamp } = firebase.firestore.FieldValue;
            todoRef.add({
                uid: getCookie("uuidv4"),
                task: input.value,
                createdAt: serverTimestamp(),
                order: await setOrder(),
                state: statem,
                id: uuidv4()
                

            });
            input.value = "";
            input.classList.remove('marked');
            checked.classList.remove('checked');
        }
        filters();
    }
});

// Function to load existing todo items from Firestore and display them
(function loadValues() {
    unsubscribe = todoRef
        .where("uid", '==', getCookie("uuidv4"))
        .orderBy("order")
        .onSnapshot(querySnapshot => {
            const items = querySnapshot.docs.map(doc => doc.data());
            
            todoList.innerHTML = "";

            var todoListHtml = "";

            items.forEach(item => {
                const { task, state, id } = item;

                todoListHtml += `
                    <li class="${state === "marked" ? "marked" : ""}" draggable="true" id="${id}">
                        <div class="btn-check ${state === "marked" ? "checked" : ""}">
                            <img class="imgCheck" src="images/icon-check.svg">
                        </div>
                        ${task}
                        <div id="cross" class="hide">
                            <img class="imgCross" src="images/icon-cross.svg">
                        </div>
                    </li>
                `;
            });

            todoList.innerHTML = todoListHtml;
            filters();

            if (Array.from(btnAc).some(btn => btn.classList.contains("btn-blue"))) {
                document.querySelectorAll("li.marked").forEach(e => e.classList.add("hideTodo"));
            }else if (Array.from(btnCom).some(btn => btn.classList.contains("btn-blue"))) {
                document.querySelectorAll("li").forEach(e => {
                    if (!e.classList.contains("marked")) {
                        e.classList.add("hideTodo");
                    }
                });
            }
        });
})();

// Event listener for clicks within the todo list container
containerList.addEventListener("click", (e) => {
    var target = e.target;

     // Check if the clicked element is the checkbox, toggle the marked state and update Firestore
    if (target.classList.contains("btn-check")) {
        var listItem = target.parentElement;

        target.classList.toggle("checked");
        listItem.classList.toggle('marked');

        var name = listItem.innerText;
        var updateState = listItem.classList.contains('marked') ? 'marked' : 'unmarked';
        var idUpdate = listItem.id;

        updateItem(name, updateState, idUpdate);

        if (Array.from(btnAc).some(btn => btn.classList.contains("btn-blue"))) {
            listItem.classList.toggle("hideTodo", listItem.classList.contains("marked"));
        } else if (Array.from(btnCom).some(btn => btn.classList.contains("btn-blue"))) {
            listItem.classList.toggle("hideTodo", !listItem.classList.contains("marked"));
        }
    }

    if (target.classList.contains("imgCross")) {
        var listItem = target.closest('li');
        var delItem = listItem.innerText;
        var delId = listItem.id;

        listItem.remove();
        
        deleteItem(delId);
    }

    filters();
});

// Event listeners for filter buttons (Active, All, Completed)
btnAc.forEach( btn => {
    btn.addEventListener("click", () => {
        listItems = document.querySelectorAll("li");
        listItems.forEach(item => item.classList.remove("hideTodo"));
    
        btnAc.forEach(bt => bt.classList.add("btn-blue"));
        btnAll.forEach(bt => bt.classList.remove("btn-blue"));
        btnCom.forEach(bt => bt.classList.remove("btn-blue"));
    
         listItems.forEach(item => {
            if (item.classList.contains("marked")) {
                item.classList.add("hideTodo");
            }
        });
        
        filters();
    });
});

btnAll.forEach(btn => {
    btn.addEventListener("click", () => {
        listItems = document.querySelectorAll("li");
        listItems.forEach(item => item.classList.remove("hideTodo"));
    
        btnAll.forEach(bt => bt.classList.add("btn-blue"));
        btnAc.forEach(bt => bt.classList.remove("btn-blue"));
        btnCom.forEach(bt => bt.classList.remove("btn-blue"));
    
        listItems.forEach(item => {
            item.classList.remove("hideTodo");
        })
        
        filters();
    });
});

btnCom.forEach(btn => {
    btn.addEventListener("click", () => {
        listItems = document.querySelectorAll("li");
        listItems.forEach(item => item.classList.remove("hideTodo"));
    
        
        btnCom.forEach(bt => bt.classList.add("btn-blue"));
        btnAc.forEach(bt => bt.classList.remove("btn-blue"));
        btnAll.forEach(bt => bt.classList.remove("btn-blue"));
    
        listItems.forEach(item => {
            if (!item.className.match("marked")) {
                item.classList.add("hideTodo");
            }
        })
    
        filters();
    });
});

// Event listener for the Clear Completed button to remove all completed items
btnCl.addEventListener("click", () => {
    listItems = document.querySelectorAll("li");
    listItems.forEach(item => {
        if (item.className.match("marked")) {
            deleteItem(item.id);
            item.remove();
        }
    })
    filters();
});

// Function to delete a todo item 
async function deleteItem(id){
    let orderToDelete;

    const docId = await todoRef
     .where('uid', '==', getCookie("uuidv4"))
     .where('id', '==', id)
     .get();
     docId.forEach(element => {
         orderToDelete = element.data().order;
         element.ref.delete();
     });

    const remainingDocs = await todoRef
     .where('uid', '==', getCookie("uuidv4"))
     .orderBy('order')
     .get();

    const batch = firebase.firestore().batch();
    let newOrder = 1; 
    remainingDocs.forEach(doc => {
         const currentOrder = doc.data().order;
         if (currentOrder > orderToDelete) {
             batch.update(doc.ref, { order: newOrder });
             newOrder++;
         }
     });

    await batch.commit();
 
}


// Function to update a todo item 
async function updateItem(item, nState, id){
     const docId = await todoRef
      .where('task', '==', item)
      .where('uid', '==', getCookie("uuidv4"))
      .where('id', '==', id)
      .get();
      docId.forEach(element => {
          element.ref.update({state: nState});
      });
  
}

// Function to update order of the todo list
async function updateOrder(id, order){
    const docId = await todoRef
     .where('uid', '==', getCookie("uuidv4"))
     .where('id', '==', id)
     .get();
     docId.forEach(element => {
         element.ref.update({order: order});
     });
 
}

// Function to find the last item in the todo list 
async function lastItem(){
    const docId = await todoRef
     .where('uid', '==', getCookie("uuidv4"))
     .orderBy('order', 'desc')
     .limit(1)
     .get();

     if (!docId.empty) {
        const lastDoc = docId.docs[0];
        return lastDoc.data();  
     }
 
}

// Event listener for drag start on list items
ul.addEventListener('dragstart', (e) => {
    // Adds a 'dragging' class to the dragged item for styling
    e.target.classList.add('dragging');

});

// Event listener for drag end on list items
ul.addEventListener("dragend", async (e) => {
    // Removes the 'dragging' class after the item is dropped
    e.target.classList.remove('dragging');
    const items = Array.from(ul.querySelectorAll('li'));

    // Update the order in Firestore based on the new positions
    const updatePromises = items.map((item, index) => {
        const id = item.id;
        const order = index + 1; 
        return updateOrder(id, order);
    });

    await Promise.all(updatePromises);
});

// Event listener for dragging over the list container
ul.addEventListener("dragover", (e) => {
    e.preventDefault(); 
    const draggingElement = ul.querySelector('.dragging');
    const afterElement = getDragAfterElement(ul, e.clientY);

    if (afterElement == null) {
        ul.appendChild(draggingElement);
    } else {
        ul.insertBefore(draggingElement, afterElement);
    }
});

let dragItem = null;
let startY = 0;

// Event listener for touch start on list items
ul.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'LI') {
        dragItem = e.target;
        startY = e.touches[0].clientY; 
        dragItem.classList.add('dragging');
    }
}, { passive: true });

// Event listener for touch move on list items
ul.addEventListener('touchmove', (e) => {
    if (dragItem) {
        e.preventDefault(); 
        const y = e.touches[0].clientY;
        const afterElement = getDragAfterElement(ul, y);

        if (afterElement == null) {
            ul.appendChild(dragItem);
        } else {
            ul.insertBefore(dragItem, afterElement);
        }
    }
}, { passive: true });

// Event listener for touch end on list items
ul.addEventListener('touchend', async (e) => {
    if (dragItem) {
        dragItem.classList.remove('dragging');
        dragItem = null;

        const items = Array.from(ul.querySelectorAll('li'));
        const updatePromises = items.map((item, index) => {
            const id = item.id;
            const order = index + 1; 
            return updateOrder(id, order);
        });

        await Promise.all(updatePromises);
    }
}, { passive: true });

// Function to get the element after the current drag position
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll("li:not(.dragging)")]; // Get all list items except the one being dragged

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();  // Get the bounding box of each item
        const offset = y - box.top - box.height / 2;   // Calculate the offset from the middle of the item

        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child }; // Update closest if the current item is closer
        } else {
            return closest; // Keep the current closest
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;  // Initialize with negative infinity to find the closest element
}