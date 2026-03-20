function getMovementFromEvent(event, previousTouch) {
    let movementX = 0;
    let movementY = 0;
    if (event instanceof MouseEvent) {
        movementX = event.movementX;
        movementY = event.movementY;
    }
    if (typeof TouchEvent !== "undefined") {
        if (event instanceof TouchEvent) {
            let touch = event.touches[0];
            if (previousTouch != undefined) {
                movementX = touch.pageX - previousTouch.pageX;
                movementY = touch.pageY - previousTouch.pageY;
            }
            previousTouch = touch;
        }
    }
    return { movementX, movementY };
}

export { getMovementFromEvent as g };
//# sourceMappingURL=mouseUtilities-DMm7UhBf.js.map

//# sourceMappingURL=mouseUtilities-DMm7UhBf.js.map