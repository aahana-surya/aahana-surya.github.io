
document.addEventListener('keydown', (event)=> {keys(event.key)});
document.addEventListener('click', (event) => {keys((event.target.className).slice(0,1))});
function keys(x){
    if(x === "w")
        new Audio("sounds/tom-1.mp3").play();
    if(x === "a")
        new Audio("sounds/tom-2.mp3").play();
    if(x === "s")
        new Audio("sounds/tom-3.mp3").play();
    if(x === "d")
        new Audio("sounds/tom-4.mp3").play();
    if(x === "j")
        new Audio("sounds/snare.mp3").play();
    if(x === "k")
        new Audio("sounds/crash.mp3").play();
    if(x === "l")
        new Audio("sounds/kick-bass.mp3").play();
    
    document.getElementsByClassName(x)[0].classList.add("pressed")
    setTimeout(function() {document.getElementsByClassName(x)[0].classList.remove("pressed");}, 100);
}