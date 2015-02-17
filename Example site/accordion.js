var ContentHeight = 250;
var TimeToSlide = 500.0;
var openAccordion = null;

function initAccordion() {
    $("#events").css("display", "none");
    $("#eventsHeader").addClass("closeHeader");

    $("#errors").css("display", "none");
    $("#errorsHeader").addClass("closeHeader");

    $("#display").css("display", "none");
    $("#displayHeader").addClass("closeHeader");

    $("#misc").css("display", "none");
    $("#miscHeader").addClass("closeHeader");

    initMenu();
    //drawArrows();
    openTab("events", 275);
  
    if (navigator.appName == "Microsoft Internet Explorer") {
        document.getElementById('info').style.paddingRight = "0px";
    }
}

//
//Draws the arrows for each LI header on body load.
//
function drawArrows() {
    var spanTags = document.getElementsByTagName('span');
    for (i=0; i < spanTags.length; i++) {
        spanTags[i].className = 'downArrow';
    }
}

//
//Changes the background color
//of the links on mouse over and mouse out.
//
function initMenu() {
    var links = document.getElementsByTagName('A');
    for (i = 0; i < links.length; i++) {
        var thisLink = links[i];
        if (thisLink.parentNode.tagName == 'LI') {
            setActivity(thisLink);
        }
    }
}

function setActivity(thisLink) {
    thisLink.onmouseover = mouseOver;
    thisLink.onmouseout = mouseOut;
}

function mouseOver() {
    $(this).parent().addClass("highlight");
    return this;
}

function mouseOut() {
    $(this).parent().removeClass("highlight");
    return this;
}

function openTab(divID, height) {
    var openingHeader = $("#" + divID + "Header");
    var closingHeader = $("#" + openAccordion + "Header");
    //var openingSpan = document.getElementById(divID + "Span");
    //var closingSpan = document.getElementById(openAccordion + "Span");
  
    if(openAccordion == divID) {
        divID = null;
        closingHeader.addClass("closeHeader");
        closingHeader.removeClass("openHeader");
        //closingSpan.className = "downArrow";
    }
    if (openAccordion == null) {
        openingHeader.addClass("openHeader");
        openingHeader.removeClass("closeHeader");
        //openingSpan.className = "upArrow";
    }

    ContentHeight = height;

    setTimeout("animate(" + new Date().getTime() + "," + TimeToSlide + ",'"
    + openAccordion + "','" + divID + "')", 33);

    openingHeader.removeClass("closeHeader");
    openingHeader.addClass("openHeader");
    closingHeader.removeClass("openHeader");
    closingHeader.addClass("closeHeader");
    openAccordion = divID;
}

function animate (lastTick, timeLeft, cID, oID) {
    var openingHeader = document.getElementById(oID + "Header");
    var closingHeader = document.getElementById(cID + "Header");
    var openingSpan = document.getElementById(oID + "Span");
    var closingSpan = document.getElementById(cID + "Span");

    var curTick = new Date().getTime();
    var elapsedTicks = curTick - lastTick;

    var opening = (oID == '') ? null : document.getElementById(oID);
    var closing = (cID == '') ? null : document.getElementById(cID);

    if(timeLeft <= elapsedTicks) {
        if(opening != null)
            opening.style.height = ContentHeight + 'px';
   
        if(closing != null) {
            closing.style.display = 'none';
            closing.style.height = '0px';
        }
        return;
    }
 
    timeLeft -= elapsedTicks;
    var newClosedHeight = Math.round((timeLeft/TimeToSlide) * ContentHeight);

    if(opening != null) {
        if(opening.style.display != 'block')
            opening.style.display = 'block';
        opening.style.height = (ContentHeight - newClosedHeight) + 'px';
    }
 
    if(closing != null)
        closing.style.height = newClosedHeight + 'px';

    setTimeout("animate(" + curTick + "," + timeLeft + ",'"
      + cID + "','" + oID + "')", 33);
    //openingSpan.className = "upArrow";
    //closingSpan.className = "downArrow";
}