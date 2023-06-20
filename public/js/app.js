var myIcon = L.icon({
  iconUrl: "../public/photograph.png",
  iconSize: [28, 28],
  shadowSize: [68, 95],
  shadowAnchor: [22, 94],
});

var mymap = L.map("mapid").setView([40.64, 22.94], 13);
var isAuthenticated = false; // Global variable to track authentication state

L.tileLayer(
  "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYmVuYW50b24iLCJhIjoiY2xnb3BhenBiMHNiZDNrbW1sZGk4NXpreiJ9.q8eVg4qxlHBOJ8_06CFSXw",
  {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
    accessToken:
      "pk.eyJ1IjoiYmVuYW50b24iLCJhIjoiY2xnb3BhenBiMHNiZDNrbW1sZGk4NXpreiJ9.q8eVg4qxlHBOJ8_06CFSXw",
  }
).addTo(mymap);

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
  document.execCommand("copy");
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
    markersData.forEach((markerData) => {
      if (markerData.lat !== null && markerData.lng !== null) {
        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: myIcon,
        }).addTo(mymap);

        console.log(markerData);

        const popupContent = document.createElement("div");
        popupContent.classList.add("popup-content");

        const imageContainer = document.createElement("div");
        imageContainer.classList.add("popup-image");
        const image = document.createElement("img");
        image.src = markerData.photo;
        imageContainer.appendChild(image);
        popupContent.appendChild(imageContainer);

        const captionContainer = document.createElement("div");
        captionContainer.classList.add("caption-container");
        captionContainer.style.display = "flex"; // Add this line
        captionContainer.style.alignItems = "center"; // Add this line
        popupContent.appendChild(captionContainer);

        const caption = document.createElement("span");
        caption.classList.add("caption");
        caption.innerHTML = markerData.caption;
        captionContainer.appendChild(caption);

        const shareButton = document.createElement("button");
        shareButton.type = "button";
        shareButton.innerHTML = '<i class="fas fa-link"></i>';
        shareButton.classList.add("share-button");
        shareButton.style.marginLeft = "auto"; // Add this line
        popupContent.appendChild(shareButton);

        // Add event listener for copying URL to clipboard
        shareButton.addEventListener("click", function (event) {
          event.preventDefault(); // Prevent the default behavior of the click event
          const markerURL = `${window.location.origin}/markers/${markerData.markerId}`;
          navigator.clipboard.writeText(markerURL).then(function () {
            console.log("URL copied to clipboard:", markerURL);
            shareButton.classList.add("fade-in-animation"); // Add this line
            setTimeout(function () {
              shareButton.classList.remove("fade-in-animation");
            }, 2000);
          });
        });

        popupContent.appendChild(shareButton);

        // Create an edit button
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.classList.add("edit-button");
        popupContent.appendChild(editButton);

        // Add event listener for edit button
        editButton.addEventListener("click", function (event) {
          event.preventDefault();
          // Redirect the user to the edit page for the specific marker
          window.location.href = `/markers/${markerData.markerId}/edit`;
        });

        marker.bindPopup(popupContent);

        const decade = getDecade(markerData.date);
        marker.decade = decade;
        marker.markerId = markerData.markerId;
        markers.push(marker);
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

// Function to change slider step based on screen size
$(document).ready(function () {
  var slider = document.getElementById("slider");

  // Function to update the slider step based on screen width
  function updateSliderStep() {
    var defaultStep = 10;
  
  // Check if the current device is a mobile phone
  if (window.matchMedia('(max-width: 1080px) and (min-resolution: 510dpi)').matches) {
    defaultStep = 20;
  }
  // Check if the current device is a PC browser
  else if (window.matchMedia('(max-width: 768px)').matches) {
    defaultStep = 20;
  }
  
  slider.noUiSlider.updateOptions({
    step: defaultStep
  });
}


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

  // Update the slider step when the window is resized
  $(window).on("resize", updateSliderStep);
});

// Function to filter markers based on the slider range
function filterMarkers() {
  const decadeRange = slider.noUiSlider.get();
  const filteredMarkers = markers.filter(function (marker) {
    const decade_test = marker.decade;
    console.log("Marker decade test:", decade_test);
    return decade_test >= decadeRange[0] && decade_test <= decadeRange[1];
  });

  // Loop through all markers and show or hide them based on whether they are in the filtered list
  markers.forEach(function (marker) {
    if (filteredMarkers.includes(marker)) {
      console.log("adding markers");
      marker.addTo(mymap);
    } else {
      console.log("removing markers");
      mymap.removeLayer(marker);
    }
  });
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

          var captionInput = document.createElement("input");
          captionInput.type = "text";
          captionInput.name = "caption";
          captionInput.placeholder = "Caption";

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
          form.appendChild(submitButton);
          form.appendChild(cancelButton);

          var popupContent = L.DomUtil.create("div");
          popupContent.appendChild(form);

          marker = L.marker(e.latlng).addTo(mymap);

          // Add the popup content to the marker
          marker.bindPopup(popupContent).openPopup();

          form.addEventListener("submit", function (event) {
            event.preventDefault();
            var formData = new FormData();
            formData.append("image", fileInput.files[0]);
            formData.append("date", dateInput.value);
            formData.append("caption", captionInput.value);
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
            var newMarker = L.marker(e.latlng).addTo(mymap);
            const date = new Date(dateInput.value);
            const decade = Math.ceil(date.getFullYear() / 10) * 10; // Calculate the decade
            // Set decade as a property of the marker
            newMarker.decade = decade;
            newMarker.caption = captionInput.value; // Set the caption as a property of the marker

            newMarker.getElement().classList.add("marker"); // Add the "marker" class

            markers.push(newMarker); // add marker to markers array
            updateSlider();

            // Remove the old marker from the map
            mymap.removeLayer(marker);

            marker = newMarker; // Assign the new marker to the "marker" variable
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

mymap.on("click", addMarker);
