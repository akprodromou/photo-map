var cameraIcon = L.icon({
  iconUrl: "/public/photograph.png",
  iconSize: [26.3, 23.7],
  iconAnchor: [8.4, 17.7],
  className: "camera-icon",
});

var triangleIcon = L.icon({
  iconUrl: "/public/triangle.png",
  iconSize: [48, 48.26],
  iconAnchor: [24, 0],
  className: "triangle-icon",
});

var mymap = L.map("mapid").setView([40.64, 22.94], 13);
// Add an event listener to the map to handle clicks outside the popup
mymap.on("click", function () {
  history.pushState(null, null, window.location.origin); // Remove any marker-specific path
});

var isAuthenticated = false; // Global variable to track authentication state

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "",
  }
).addTo(mymap);

// Hide the default Leaflet attribution control
document.getElementsByClassName(
  "leaflet-control-attribution"
)[0].style.display = "none";

// Define an empty array to store markers if it doesn't exist
if (typeof markers === "undefined") {
  var markers = [];
}

// Define the copyToClipboard function
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.body.removeChild(textarea);
  console.log("URL copied to clipboard:", text);
}

// Fetch markers and display them on the map
fetch("/markers")
  .then((response) => response.json())
  .then((markersData) => {
    if (!markersData) {
      console.error("Error fetching markers: markersData is null or undefined");
      return;
    }

    // Check if the URL contains a marker ID parameter
    const urlParams = new URLSearchParams(window.location.search);
    const markerIdParam = urlParams.get("markerId");

    markersData.forEach((markerData) => {
      if (markerData.lat !== null && markerData.lng !== null) {
        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: cameraIcon,
        });

        const popupContent = document.createElement("div");
        popupContent.classList.add("popup-content");

        // Create the image container
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("popup-image");
        popupContent.appendChild(imageContainer);

        // Create an image element
        const image = document.createElement("img");
        image.src = markerData.photo;
        image.alt = "Marker Image";
        imageContainer.appendChild(image);

        const captionContainer = document.createElement("div");
        captionContainer.classList.add("caption-container");
        captionContainer.style.display = "flex";
        popupContent.appendChild(captionContainer);

        const markerDate = new Date(markerData.date);
        const startYearDisplay =
        markerDate.getFullYear() - (markerDate.getFullYear() % 10);
        const endYearDisplay = startYearDisplay + 10;

        const decadeContainer = document.createElement("div");
        decadeContainer.classList.add("decade-container");
        decadeContainer.innerHTML = `<strong>${startYearDisplay}-${endYearDisplay}</strong>`;
        captionContainer.appendChild(decadeContainer);

        const shareButton = document.createElement("button");
        shareButton.type = "button";
        shareButton.innerHTML = '<i class="fas fa-link"></i>';
        shareButton.classList.add("share-button");
        captionContainer.appendChild(shareButton);

        const caption = document.createElement("span");
        caption.classList.add("caption");
        caption.innerHTML = markerData.caption;
        popupContent.appendChild(caption);

        // Create the message element
        const messageElement = document.createElement("span");
        messageElement.classList.add("popup-message");
        popupContent.appendChild(messageElement);

        // Add event listener for copying URL to clipboard
        shareButton.addEventListener("click", function (event) {
          event.preventDefault(); // Prevent the default behavior of the click event
          const markerURL = `${window.location.origin}/markers/${markerData.markerId}`;
          navigator.clipboard.writeText(markerURL).then(function () {
            console.log("URL copied to clipboard:", markerURL);
            shareButton.classList.add("fade-in-animation");
            setTimeout(function () {
              shareButton.classList.remove("fade-in-animation");
            }, 2000);

            // Set and display the message within the popup
            messageElement.textContent = "Link copied!";
            setTimeout(function () {
              messageElement.textContent = "";
            }, 2000);
          });
        });

        // Create an edit button
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.classList.add("edit-button");

        // Add event listener for edit button
        editButton.addEventListener("click", function (event) {
          event.preventDefault();
          // Redirect the user to the edit page for the specific marker
          window.location.href = `/markers/${markerData.markerId}/edit`;
        });

        popupContent.appendChild(editButton);

        marker.bindPopup(popupContent);

        const decade = getDecade(markerData.date);
        marker.decade = decade;
        marker.markerId = markerData.markerId;
        marker.angle = markerData.angle;
        markers.push(marker);

        marker.on("click", function (event) {
          L.DomEvent.stopPropagation(event); // Prevent the event from propagating to the map and closing the popup
        });
      }
    });

    updateSlider();
    filterMarkers();
  })
  .catch((error) => console.error("Error fetching markers:", error));

// A function that extracts the decade from a date
function getDecade(dateString) {
  const year = Number(dateString.substring(0, 4)); // Extract the year and convert it to a number
  return Math.floor(year / 10) * 10; // Return the exact decade
}

function updateSlider() {
  slider.noUiSlider.updateOptions({
    connect: true,
  });
  // Call the filterMarkers function when the slider value changes
  slider.noUiSlider.on("slide", filterMarkers);
}

// Make slider range
var slider = document.getElementById("slider");
var hideButton = document.getElementById("hideButton");
var sliderVisible = true;

// Function to update the slider step based on screen width and device resolution
function updateSliderStep() {
  var defaultStep = 10;

  // Check if the current device is a device with a screen width less than or equal to 1080 pixels and a pixel density of 515 PPI
  if (
    window.matchMedia("(max-width: 1080px) and (min-resolution: 515dpi)")
      .matches
  ) {
    defaultStep = 20;
  }
  // Check if the current device is a desktop browser with a screen width less than or equal to 768 pixels
  else if (window.matchMedia("(max-width: 768px)").matches) {
    defaultStep = 20;
  }
  slider.noUiSlider.updateOptions({
    step: defaultStep,
  });
}

// Function to change slider step based on screen size
$(document).ready(function () {
  var slider = document.getElementById("slider");

  // Create the noUiSlider with the initial options
  noUiSlider
    .create(slider, {
      start: [1860, 2020],
      connect: true,
      range: {
        min: 1860,
        max: 2020,
      },
      format: {
        to: (value) => Math.round(value),
        from: (value) => Math.round(value),
      },
      step: 10,
      pips: { mode: "steps" },
    })
    .on("slide", filterMarkers);

  // Call the function immediately to set the initial slider step
  updateSliderStep();
  // Update the slider step when the window is resized
  $(window).on("resize", updateSliderStep);
});

let clickedMarker = null;
let triangleMarkersLayer = L.layerGroup().addTo(mymap); 

// Function to filter markers based on the slider range
function filterMarkers() {
  const decadeRange = slider.noUiSlider.get();
  const filteredMarkers = markers.filter(function (marker) {
    const decade_test = marker.decade;
    return decade_test >= decadeRange[0] && decade_test <= decadeRange[1];
  });

  // Remove all previous event listeners for mouseover and mouseout
  markers.forEach(function (marker) {
    marker.off("mouseover");
    marker.off("mouseout");
  });

  // Variable to track the currently hovered marker and clicked marker
  let hoveredMarker = null;

  // Define the transparent circle options
  const circleOptions = {
    radius: 250,
    opacity: 0,
    fillOpacity: 0,
    interactive: true,
  };

  // Clear the triangle markers layer
  triangleMarkersLayer.clearLayers();

  // Create a transparent circle for each marker
  filteredMarkers.forEach(function (marker) {
    if (!marker.circle) {
      const circle = L.circle(marker.getLatLng(), circleOptions);
      marker.circle = circle;
      // Listen for zoom level changes
      mymap.on("zoomend", function () {
        // Adjust the circle radius based on the current zoom level
        const zoomLevel = mymap.getZoom();
        const radius = calculateRadius(zoomLevel); // Calculate the radius based on the zoom level
        circle.setRadius(radius);
      });

      // Function to calculate the circle radius based on the zoom level
      function calculateRadius(zoomLevel) {
        return 250 - 12 * zoomLevel;
      }
    }
  });

  // Loop through all markers and show or hide them based on whether they are in the filtered list
  markers.forEach(function (marker) {
    if (filteredMarkers.includes(marker)) {
      if (!mymap.hasLayer(marker)) {
        marker.addTo(mymap);
        marker.circle.addTo(mymap); // Add the circle to the map
      }

      // Create a triangle marker for the hovered state
      let triangleMarker = L.marker(marker.getLatLng(), {
        icon: triangleIcon,
        rotationAngle: marker.angle,
      });

      triangleMarker.disableClickPropagation;

      marker.on("mouseover", function () {
        if (hoveredMarker && hoveredMarker !== marker) {
          // If another marker was previously hovered, hide its triangle icon
          triangleMarkersLayer.removeLayer(hoveredMarker.triangleMarker);
          hoveredMarker.setIcon(cameraIcon);
        }
        if (hoveredMarker !== marker) {
          hoveredMarker = marker; // Update the currently hovered marker
          marker.setIcon(cameraIcon);
          triangleMarkersLayer.addLayer(triangleMarker); // Show the triangle icon
        }
      });

      marker.on("click", function (event) {
        if (clickedMarker === marker) {
          clickedMarker.setIcon(cameraIcon);
          clickedMarker = null; // Reset the currently clicked marker
        } else {
          // If another marker was previously clicked, hide its triangle icon
          if (clickedMarker) {
            triangleMarkersLayer.removeLayer(clickedMarker.triangleMarker);
            clickedMarker.setIcon(cameraIcon);
          }
          // Show the triangle icon for the clicked marker
          clickedMarker = marker; // Update the currently clicked marker
          triangleMarkersLayer.addLayer(clickedMarker.triangleMarker); 
          marker.setIcon(cameraIcon);
          triangleMarker.disableClickPropagation;
          marker.openPopup();
          window.history.pushState(null, null, `/markers/${marker.markerId}`); // Update the URL in the address bar
        }
      });

      marker.on("mouseout", function () {
        // If the marker being hovered is the current one and not clicked, hide its triangle icon
        if (hoveredMarker === marker && !clickedMarker) {
          triangleMarkersLayer.removeLayer(triangleMarker);
          hoveredMarker.setIcon(cameraIcon);
          hoveredMarker = null; // Reset the currently hovered marker
        }
      });

      marker.setIcon(cameraIcon); // Set the initial icon as the camera icon

      // Store the triangle marker as a property of the marker object
      marker.triangleMarker = triangleMarker;
      // Add click event listener to the circle
      marker.circle.on("click", function (event) {
        marker.fire("click"); // Trigger the click event on the associated marker
      });
    } else {
      if (marker.triangleMarker) {
        triangleMarkersLayer.removeLayer(marker.triangleMarker);
        delete marker.triangleMarker;
      }
      if (mymap.hasLayer(marker)) {
        mymap.removeLayer(marker);
      }
    }
  });

  if (clickedMarker && !filteredMarkers.includes(clickedMarker)) {
    if (clickedMarker.triangleMarker) {
      triangleMarkersLayer.removeLayer(clickedMarker.triangleMarker);
      delete clickedMarker.triangleMarker;
    }
    clickedMarker.setIcon(cameraIcon);
    clickedMarker = null; // Reset the currently clicked marker
  }
}

function addMarker() {
  // Check if the user is authenticated before allowing marker creation
  fetch("/check-authentication")
    .then((response) => response.json())
    .then((data) => {
      const isAuthenticated = data.isAuthenticated;

      if (isAuthenticated) {
        // Only authenticated users can add markers
        mymap.once("click", function (e) {
          var marker;
          var form = document.createElement("form");
          form.setAttribute("enctype", "multipart/form-data");

          var fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = "image/*";
          fileInput.name = "image";
          fileInput.required = true;

          var dateInput = document.createElement("input");
          dateInput.type = "date";
          dateInput.name = "date";
          dateInput.required = true;

          var captionInput = document.createElement("textarea");
          captionInput.name = "caption";
          captionInput.placeholder = "Caption";
          captionInput.rows = 4;

          var angleInput = document.createElement("input");
          angleInput.type = "text";
          angleInput.name = "angle";
          angleInput.placeholder = "angle";

          var submitButton = document.createElement("button");
          submitButton.type = "submit";
          submitButton.innerHTML = "Save Marker";

          var cancelButton = document.createElement("button");
          cancelButton.type = "button";
          cancelButton.innerHTML = "Cancel";
          cancelButton.id = "cancel-add-marker";
          cancelButton.addEventListener("click", function () {
            mymap.removeLayer(marker);
          });

          form.appendChild(fileInput);
          form.appendChild(dateInput);
          form.appendChild(captionInput);
          form.appendChild(angleInput);
          form.appendChild(submitButton);
          form.appendChild(cancelButton);

          var popupContent = L.DomUtil.create("div");
          popupContent.appendChild(form);

          marker = L.marker(e.latlng).addTo(mymap);

          marker.getElement().classList.add("marker");

          marker.on("mouseover", function (e) {
            this.openPopup();
          });

          // Add the popup content to the marker
          marker.bindPopup(popupContent).openPopup();

          form.addEventListener("submit", function (event) {
            event.preventDefault();
            var formData = new FormData();
            formData.append("image", fileInput.files[0]);
            formData.append("date", dateInput.value);
            formData.append("caption", captionInput.value);
            formData.append("angle", angleInput.value);
            formData.append("lat", e.latlng.lat);
            formData.append("lng", e.latlng.lng);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/markers");

            xhr.onreadystatechange = function () {
              if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                  console.log("Marker saved to database.");
                  // Parse the response to get the marker ID
                  var response = JSON.parse(xhr.responseText);
                  var markerId = response.markerId;
                  console.log("The marker id is:", response.markerId);
                } else {
                  console.error("Error saving marker:", xhr.responseText);
                }
              }
            };

            xhr.send(formData);

            marker.closePopup();

            const date = new Date(dateInput.value);
            const decade = Math.ceil(date.getFullYear() / 10) * 10; // Calculate the decade
            // Set decade as a property of the marker
            marker.decade = decade;
            marker.caption = captionInput.value; // Set the caption as a property of the marker
            marker.angle = angleInput.value; // Add the angle property to the marker
            markers.push(marker); // Add marker to markers array
            updateSlider();
          });

          var cancelAddMarkerButton =
            document.getElementById("cancel-add-marker");
          cancelAddMarkerButton.addEventListener("click", function () {
            mymap.removeLayer(marker);
          });

          marker.getPopup().addEventListener("remove", function () {
            mymap.removeLayer(marker);
          });
        });
      } else {
        // User is not authenticated, display an error message or take appropriate action
        console.error("Only authenticated users can add markers.");
      }
    })
    .catch((error) => {
      console.error("Error checking authentication status:", error);
    });
}

mymap.on("click", function (event) {
  // Check if a marker icon was clicked
  if (event.originalEvent.target === cameraIcon.options.iconUrl) {
    return; // Do not trigger addMarker function if a marker icon was clicked
  }
  // Remove any marker-specific path
  history.pushState(null, null, window.location.origin);
  // Call the addMarker function
  addMarker();
});

// Declare a global object to store variables
window.app = {};

// Assign the map object to the global object
window.app.map = mymap;
