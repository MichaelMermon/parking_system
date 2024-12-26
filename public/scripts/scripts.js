// Fetch API URL from environment variables (Vercel provides them automatically for the frontend)
const apiUrl = 'https://parking-system-nine.vercel.app'; // Use the production backend URL

// Function to update the status of a parking slot
function updateSlotStatus(slotId, status) {
    const statusElement = document.getElementById(`status-${slotId}`);
    if (statusElement) {
        statusElement.textContent = status ? "Available" : "Occupied";
        statusElement.style.color = status ? "green" : "red"; // Green for available, red for occupied
    }
}

// Function to fetch and update slot status from the backend
function fetchSlotStatus() {
    fetch(`${apiUrl}/api/slots`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(slots => {
            if (Array.isArray(slots)) {
                slots.forEach(slot => {
                    updateSlotStatus(slot.slot_number, slot.status);
                });
            } else {
                console.error("Unexpected response format from backend:", slots);
            }
        })
        .catch(error => console.error('Error fetching slot status:', error));
}

// Refresh slot status every minute
setInterval(fetchSlotStatus, 60 * 1000);

// Function to handle the reservation form submission
document.addEventListener('DOMContentLoaded', () => {
    const reservationForm = document.getElementById('reservation-form');
    if (reservationForm) {
        reservationForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get the form data
            const slot = document.getElementById('slot').value;
            const start = document.getElementById('start').value;
            const end = document.getElementById('end').value;
            const name = document.getElementById('name').value;
            const contact = document.getElementById('contact').value;

            // Validate form data
            if (!slot || !start || !end || !name || !contact) {
                alert('All fields are required!');
                return;
            }

            // Send the reservation data to the backend
            fetch(`${apiUrl}/api/reserve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slot_number: slot,
                    start: start,
                    end: end,
                    name: name,
                    contact: contact,
                }),
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || 'Failed to reserve slot');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    alert('Reservation Successful!');
                    updateSlotStatus(slot, false);
                    reservationForm.reset();
                })
                .catch(error => {
                    console.error('Error making reservation:', error);
                    alert(`Reservation failed: ${error.message}`);
                });
        });
    }
});

// Function to fetch reservation for a specific contact
function fetchReservation(contact) {
    fetch(`${apiUrl}/api/reservations?contact=${contact}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.message) {
                alert(data.message);
            } else {
                displayReservation(data);
            }
        })
        .catch(error => console.error('Error fetching reservation:', error));
}

// Function to display reservation details
function displayReservation(reservation) {
    const reservationDetails = document.getElementById('reservation-details');
    if (reservationDetails) {
        const currentTime = new Date();
        const endTime = new Date(reservation.end);
        const isExpired = currentTime > endTime;

        reservationDetails.innerHTML = `
            <h2>Your Reservation</h2>
            <p><strong>Slot Number:</strong> ${reservation.slot_number}</p>
            <p><strong>Start Time:</strong> ${reservation.start}</p>
            <p><strong>End Time:</strong> ${reservation.end}</p>
            <p><strong>Name:</strong> ${reservation.name}</p>
            <p><strong>Contact:</strong> ${reservation.contact}</p>
            <p><strong>Status:</strong> ${isExpired ? 'Expired' : 'Active'}</p>
            <hr>
        `;

        generateQRCode(reservation);
    }
}

// Function to generate QR code
function generateQRCode(reservation) {
    const qrCodeContainer = document.getElementById('qr-code');
    if (qrCodeContainer) {
        qrCodeContainer.innerHTML = ""; // Clear any existing QR code
        const qrCodeData = `Reservation for ${reservation.name}\nSlot: ${reservation.slot_number}\nStart: ${reservation.start}\nEnd: ${reservation.end}`;
        new QRCode(qrCodeContainer, {
            text: qrCodeData,
            width: 128,
            height: 128,
        });
    }
}

// Initialize parking slot status on page load
window.onload = fetchSlotStatus;
