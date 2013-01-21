/*
 
Brushing for CS 171 Final Project: Harvard Course Analytics
Spring 2012
 
*/

// should popups be concise
var concisePopups = false;
var circleSizeEncoding = true;

// popup panel
var popupPanel;
var popupWidth = 700, popupHeight = 400;
var graphWidth = 900, graphHeight = 550;

// set window coordinates;
var mouseX = 0;
var mouseY = 0;

// store graph data
var nodes;
var links;
var coursesBeingCompared = [];
var courseInFocus;
var courseBeingCompared;
var neighborAverages = {};
var circleRadius = 5;

// set up google visualizations
google.load("visualization", "1", {packages:["corechart"]});
google.setOnLoadCallback(drawComparisonChart);

// set color scale
// var color = d3.scale.category20();
/* var color = d3.scale.quantize()
.domain([1.0, 10.0])
.range(colorbrewer.YlGnBu[5]); */

// our own color fxn
function color(colorIndex) {
    var colors = [
                  "#1f77b4", 
                  "#98df8a",
                  "#8c564b",
                  "#c7c7c7",
                  "#aec7e8",
                  "#d62728",
                  "#c49c94",
                  "#bcbd22",
                  "#ff7f0e",
                  "#ff9896",
                  "#e377c2",
                  "#dbdb8d",
                  "#ffbb78",
                  "#9467bd",
                  "#f7b6d2",
                  "#17becf",
                  "#2ca02c",
                  "#c5b0d5",
                  "#7f7f7f",
                  "#9edae5"
                  ];
    return colors[colorIndex - 1];
}
var color = color;

// all departments allowed
var departments = ["ANTHRO", 
                   "ASTRON",
                   "CHEM", 
                   "COMPSCI", 
                   "ECON", 
                   "ENGLISH", 
                   "ENG-SCI",
                   "GOV", 
                   "HIST",
                   "MATH", 
                   "MCB",
                   "MUSIC",
                   "PHIL",
                   "PSY", 
                   "PHYSICS",
                   "SOC-STD",
                   "SOCIOL",
                   "STAT",
                   "VES",
                   "WOMGEN"
               ];

// Q Guide factors to examine for a course
var qDataFactors = [
        ["overall", "Overall"],
        ["assignments", "Assignments"],
        ["difficulty", "Difficulty"],
        ["workload", "Workload"],
        ["wouldYouRecommend", "Recommend?"]
    ]

// translate abbreviation of department to actual name
function translateToActualDeptName(abbrev) {
    var fullNames = {
        "ANTHRO": "Anthropology", 
        "ASTRON": "Astronomy",
        "CHEM": "Chemistry", 
        "COMPSCI": "Comp. Sci.", 
        "ECON": "Economy", 
        "ENGLISH": "English", 
        "ENG-SCI": "Engineering",
        "GOV": "Government", 
        "HIST": "History",
        "MATH": "Mathematics", 
        "MCB": "MCB",
        "MUSIC": "Music",
        "PHIL": "Philosophy",
        "PSY": "Psychology", 
        "PHYSICS": "Physics",
        "SOC-STD": "Social Studies",
        "SOCIOL": "Sociology",
        "STAT": "Statistics",
        "VES": "VE Studies",
        "WOMGEN": "WG Studies"
    }
    return fullNames[abbrev];
}

// calculates the radius given the area of a circle
function getRadius(area) {
    return Math.sqrt((9*area)/Math.PI);
}

// update circle radii
function updateCircleRadii() {
    if (circleSizeEncoding)
        $("circle.node").each(function() {
                              $(this).attr("r", getRadius(this.__data__.enrollment));
                              });
    else
        $("circle.node").attr("r", circleRadius);
}

// toggle whether the circle size encodes enrollment
function toggleCircleEncoding() {
    circleSizeEncoding = !circleSizeEncoding;
    updateCircleRadii();
}

// rounds a decimal to a certain number of places
function roundToPlaces(num, places) {
    var baseValue = Math.pow(10, places);
    return Math.round(num * baseValue) / baseValue;
}

// calculates the average q rating data for neighboring nodes
function calculateNeighborAverages() {
    var toTakeOut = 0;
    var takeOut;
    for (var i = 0; i < qDataFactors.length; i++) {
        neighborAverages[qDataFactors[i][0]] = 0;
    }
    for (var i = 0; i < coursesBeingCompared.length; i++) {
        takeOut = false;
        for (var j = 0; j < qDataFactors.length; j++) {
            if (coursesBeingCompared[i][qDataFactors[j][0]] > 0)
                neighborAverages[qDataFactors[j][0]] += coursesBeingCompared[i][qDataFactors[j][0]];
            else
                takeOut = true;
        }
        takeOut && ++toTakeOut;
    }
    for (var i = 0; i < qDataFactors.length; i++) {
        if (coursesBeingCompared.length > 0) {
            neighborAverages[qDataFactors[i][0]] /= (coursesBeingCompared.length - toTakeOut);
            neighborAverages[qDataFactors[i][0]] = roundToPlaces(neighborAverages[qDataFactors[i][0]], 2);
        }
        else
            neighborAverages[qDataFactors[i][0]] = 0;
    }
}

// gives the full presentation name of a course along with its abbreviation
function courseFullName(course) {
    return course.name + " (" + course.abbrev + ")";
}

// draws a bar chart comparing courses
function drawComparisonChart() {
    // ignore proxy call to chart drawing function
    if ((!courseInFocus) && (!courseBeingCompared))
        return;
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Factor');
    data.addColumn('number', courseInFocus.abbrev);
    data.addColumn('number', courseBeingCompared.abbrev + " (Related Course)");
    data.addColumn('number', "Average of Related Courses");
    for (var i = 0; i < qDataFactors.length; i++) {
        data.addRow([
                     qDataFactors[i][1],
                     courseInFocus[qDataFactors[i][0]],
                     courseBeingCompared[qDataFactors[i][0]],
                     neighborAverages[qDataFactors[i][0]]
                ]);
    }
    var options = {
        // vAxis: {title: 'Q Guide Factors',  titleTextStyle: {color: 'red'}},
        hAxis: {maxValue: 5.0, viewWindowMode: "explicit", viewWindow: {min: 0.0, max: 6.0}}, 
        legend: {position: 'top', textStyle: {float: 'left'}},
        width: popupWidth + 200,
        height: 320,
        fontName: 'Arial',
        backgroundColor: 'transparent'
    };
    var chart = new google.visualization.BarChart(document.getElementById('courseComparisonChart'));
    chart.draw(data, options);
}

// hides all courses and links
function hideAllCoursesAndLinks() {
    $("line.link, circle.node").hide();
}

// attaches a popup panel to the body
function attachPopupPanel() {
    var padding = 10;
    var closeButton, selectCoursesUITool;
    
    popupPanel = $("<div>").attr("id", "popupPanel")
    .css("background", "#fff")
    .css("color", "#000")
    .width(popupWidth)
    .height(popupHeight)
    .css("padding", padding + "px")
    .css("position", "fixed")
    .css("left", "50%")
    .css("margin-left", "-" + popupWidth/2 + "px")
    .css("top", "50%")
    .css("margin-top", "-" + popupHeight/2 + "px")
    .css("opacity", 0.9)
    .hide();
    
    closeButton = $("<div>").attr("class", "closeButton")
    .css("position", "absolute")
    .css("top", "10px")
    .css("right", "10px")
    .css("cursor", "pointer")
    .html("(Close)")
    .appendTo(popupPanel);
    
    selectCoursesUITool = $("<select>").addClass("selectCoursesUITool");
    // compare courses when select menu changes
    selectCoursesUITool.change(function() {
       courseComparison(courseInFocus, nodes[$(this).val()]);
    });
    
    $("<h2>").css("padding-top", "0")
    .width(popupWidth - 40)
    .css("margin-top", "0")
    .appendTo(popupPanel);
    $("<p>").html("Pick a related course to compare Q Ratings (0.0-5.0) with:").appendTo(popupPanel);
    
    $("<span>").html("All Related Courses: ").appendTo(popupPanel);
    selectCoursesUITool.appendTo(popupPanel);
                                                                                              
    $("<div>").attr("id", "courseComparisonChart")
    .css("width", "100%")
    .height(200)
    .appendTo(popupPanel);
    
    // let close button close the popup panel
    closeButton.click(function() {
        popupPanel.hide();                  
    });
    
    popupPanel.appendTo("body");
}

// compares 2 courses
function courseComparison(course1, course2) {
    courseBeingCompared = course2;
    drawComparisonChart();
}

// returns direction of hover over interaction
function popupDirection() {
    var wHeight = $(window).height();
    var wWidth = $(window).width();
    var direction = '';
    
    // determine y direction
    if (mouseY > wHeight*2/3)
        direction = 's';
    else if (mouseY > wHeight/3)
        direction = '';
    else
        direction = 'n';
    
    // determine x direction
    if (mouseX > graphWidth*2/3)
        direction += 'e';
    else if (mouseX > graphWidth/3)
        direction += '';
    else
        direction += 'w'
    
    // have at least 1 direction
    if (direction == '')
        direction = 'w';
    
    return direction;
}

// updates concise state of popups
function updatePopupConciseState() {
    concisePopups = ($("[name='concisePopups']").attr("checked") == "checked");
}

// draw out legend.
function legend() {
    var legend = $("#legend");
    var innerLegend = $("<div>");
    var legendItem;
    var colorBox;
    var deptName;
    var check;
    var legendItemContainer = $("<div>").attr("id", "legendItems");
    
    // Filter by Keyword.
    $("<input>").attr("type", "text")
    .attr("name", "keywordFilter")
    .attr("placeholder", "Filter by Keywords in Description")
    .width(200)
    .keyup(filterCourses)
    .appendTo(innerLegend);
    
    
    // legend title
    $("<h2>").html("Legend").appendTo(innerLegend);
    
    // checkbox management buttons
    $("<a>").html("Check All").click(function() {
                                           checkAllDepartmentBoxes();
                                           return false;})
    .appendTo(innerLegend);
    $("<a>").html("Uncheck All<br />").click(function() {
                                       unCheckAllDepartmentBoxes();
                                       return false;})
    .appendTo(innerLegend);
    
    // write out all the departments with their colors
    for (var i = 0; i < departments.length; i++) {
        legendItem = $("<div>").addClass("legendItem");
        check = $("<input>").attr("type", "checkbox").attr("data-group", i+1);
        colorBox = $("<div>").addClass("colorBox").css('background', color(i+1));
        deptName = $("<div>").addClass("deptName").html(translateToActualDeptName(departments[i]));
        legendItem.append(check).append(colorBox).append(deptName).appendTo(legendItemContainer);
    }
    
    // append all dept labels to element, avoiding extra reflow ops.
    innerLegend.append(legendItemContainer).appendTo(legend);
}

// checks all boxes in the legend
function checkAllDepartmentBoxes() {
    $("#legend input[type='checkbox']").attr("checked", "checked").trigger("change");
}

// unchecks all boxes in the legend
function unCheckAllDepartmentBoxes() {
    $("#legend input[type='checkbox']").removeAttr("checked");
    hideAllCoursesAndLinks();
}

// filters courses by department
function filterCourses() {
    var selector;
    var deptIndex;
    var words;
    $("line.link").show();
    for (var i = 0; i < departments.length; i++) {
        deptIndex = i + 1;
        // if department is on, display it.
        if ($("#legend input[type='checkbox'][data-group='"+deptIndex+"']").attr("checked") == "checked") {
            $("circle.deptNum" + deptIndex).show();
        }
        // if department is off, don't display it.
        else {
            selector = "circle.deptNum" + deptIndex + ", ";
            selector += "line.source" + (deptIndex + 1) + ", line.target" + (deptIndex + 1);
            $(selector).hide();
        }
    }
    
    // get all words in textbox, hide course if it lacks these words
    words = $("input[name='keywordFilter']").val()
    .replace(",", " ")
    .split(" ");
    console.debug(words);
    
    $("circle.node").filter(function() {
                            var allWordsInDescription = true;
                            for (var i = 0; i < words.length; i++) {
                                if (-1 >= this.__data__.description.toUpperCase().search(words[i].toUpperCase()))
                                    allWordsInDescription = false;
                            }
                            return (!allWordsInDescription);
                            })
    .each(function() {
          var courseIndex = this.__data__.index;
          $("#node" + courseIndex).hide();
          $("line[data-source-index='" + courseIndex + "']").hide();
          $("line[data-target-index='" + courseIndex + "']").hide();
      });
    
    
}

// highlights a node
function highlightNode(nodeIndex) {
    $("#node" + nodeIndex).css('stroke', '#fff').css('stroke-width', '4');
}

// unhighlights nodes
function unhighlightNodes() {
    $("circle.node").css('stroke', '#fff').css('stroke-width', '1');
}

// highlight outgoing nodes adjacent to a node
function hoverNodeNeighbors(nodeIndex) {
    $("#node" + nodeIndex).css('stroke', '#ff0').css('stroke-width', '4');
    for (var i = 0; i < links.length; i++) {
        if (links[i].source.index == nodeIndex)
            highlightNode(links[i].target.index);
        else if (links[i].target.index == nodeIndex)
            highlightNode(links[i].source.index);
    }
}

// updates the panel with course information
function updatePanelWithCourse(course) {
    popupPanel.children("h2").html(courseFullName(course));
    courseInFocus = course;
    // write options to select menu
    coursesBeingCompared.length = 0;
    popupPanel.children("select").empty();
    for (var i = 0; i < links.length; i++) {
        if (links[i].source.index == course.index) {
            coursesBeingCompared.push(links[i].target);
            $("<option>").html(courseFullName(links[i].target))
            .val(links[i].target.index)
            .appendTo(popupPanel.children("select"));
        }
    }
    courseBeingCompared = coursesBeingCompared[0];
    calculateNeighborAverages();
    courseComparison(courseInFocus, courseBeingCompared);
}

// allows for description to appear concurrently with hover effects 
function assignDescriptionBrushing() {
    $("#descriptionContainer").hide();
    $("circle.node").hover(function() {
                           $("#descriptionContainer").show();
                           $("#descriptionContainer .strText").html(this.__data__.description);
                           },
                           function() {
                           $("#descriptionContainer").hide();
                           }
                           );
}

// wait until elements and styles have loaded before accessing them
window.onload = function() {
    
    // register mouse positions
    $(document).mousemove(function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }); 
    
    var width = graphWidth,
    height = graphHeight;
    var r = 6;
    
    var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);
    
    var svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height);
    
    d3.json("dependency-data.json", function(json) {
            nodes = json.nodes;
            links = json.links;
        
            force
            .nodes(nodes)
            .links(links)
            .start();
                        
            var link = svg.selectAll("line.link")
            .data(json.links)
            .enter().append("line")
            .attr("data-source-index", function(d) {return d.source.index;})
            .attr("data-target-index", function(d) {return d.target.index;})
            .attr("class", function(d) {return "link source" + (d.source.group + 1) + " target" + (d.target.group + 1);})
            .style("stroke-width", function(d) { return Math.sqrt(d.value); });
            
            var node = svg.selectAll("circle.node")
            .data(json.nodes)
            .enter().append("circle")
            .attr("class", function(d) {return "node " + "deptNum" + d.group;})
            .attr("id", function(d) {return "node" + d.index;})
            .attr("data-node-index", function (d) {return d.index;})
            .attr("r", function(d) {return getRadius(d.enrollment)})
            .style("fill", function(d) { return color(d.group); })
            .style("z-index", function(d) { return 1000 - d.enrollment })
            .call(force.drag);
            
            force.on("tick", function() {
                 link.attr("x1", function(d) { return d.source.x; })
                 .attr("y1", function(d) { return d.source.y; })
                 .attr("x2", function(d) { return d.target.x; })
                 .attr("y2", function(d) { return d.target.y; });
                 
                 // Keep the balls in bounds.
                 node.attr("cx", function(d) { return d.x = Math.max(r, Math.min(width - r, d.x)); })
                 .attr("cy", function(d) { return d.y = Math.max(r, Math.min(height - r, d.y)); });
             });
            $("circle.node").tipsy({  
                 gravity: popupDirection, 
                 html: true, 
                 title: function() {
                     d = this.__data__, n = courseFullName(d), enr = d.enrollment, dep = departments[d.group - 1];
                     var hover = "<div class='hoverPopUp'>";
                     hover += "<span class='courseTitle'>" + n + "</span><br />";
                     if (!concisePopups) {
                         hover += "Department: <span class='courseDept'>" + translateToActualDeptName(dep) + "</span><br />";
                         hover += "Enrollment (2011): <span class='courseEnrollment'> " + enr + "</span>";
                     }
                     hover += "</div>";
                     return hover;
                 }
             });
            
            // assign hover effect for nodes
            $("circle.node").hover(
               function() {
                    hoverNodeNeighbors($(this).attr("data-node-index"));
               }, 
                    unhighlightNodes
             );
            
            // populate popup with content
            $("circle.node").click(function() {
                updatePanelWithCourse(this.__data__);
                popupPanel.show();
            });
            
            // load google visualizations api
            courseInFocus = nodes[0];
            courseBeingCompared = nodes[1];
            assignDescriptionBrushing();
        });
    
    // allow for concise popups and circle size encoding
    $("[name='concisePopups']").change(updatePopupConciseState);
    $("[name='circleSizeEncoding']").attr("checked", "checked").change(toggleCircleEncoding);
    
    // draw legend
    legend();
    $("#legend input").change(filterCourses);
    checkAllDepartmentBoxes();
    attachPopupPanel();
}
