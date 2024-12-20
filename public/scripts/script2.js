document.addEventListener('DOMContentLoaded', function () {
    // Handle form submission for entering contact number
    const contactForm = document.getElementById('contact-form');
    const reservationInfo = document.getElementById('reservation-info');

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent the form from submitting and reloading the page

        const contact = document.getElementById('contact').value; // Get the contact number from the input field

        if (contact) {
            // Fetch reservation details from the server based on the contact number
            fetch(`http://localhost:3000/api/reservations?contact=${contact}`)
                .then(response => response.json()) // Parse the JSON response
                .then(reservation => {
                    if (reservation.message) {
                        // If no reservation is found, show the message
                        reservationInfo.innerHTML = `<p>${reservation.message}</p>`;
                    } else {
                        // If a reservation is found, extract and format the reservation details
                        const { id, slot_number, start, end, name } = reservation;

                        const startDate = new Date(start);
                        const endDate = new Date(end);

                        const formattedStartDate =
                            startDate.toLocaleDateString() +
                            ' ' +
                            startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const formattedEndDate =
                            endDate.toLocaleDateString() +
                            ' ' +
                            endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        // Create data for QR code (QR code generated with reservation details)
                        const qrCodeData = `Name: ${name}\nSlot: ${slot_number}\nStart: ${formattedStartDate}\nEnd: ${formattedEndDate}`;

                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeData)}`;

                        // Display the reservation details along with the QR code
                        reservationInfo.innerHTML = ` 
                            <ul style="list-style-type: none; padding-left: 0;">
                                <li><strong>Name:</strong> ${name}</li>
                                <li><strong>Slot Number:</strong> ${slot_number}</li>
                                <li><strong>Start:</strong> ${formattedStartDate}</li>
                                <li><strong>End:</strong> ${formattedEndDate}</li>
                                <li><img src="${qrCodeUrl}" alt="QR Code"></li>
                                <li><button id="cancel-button" data-reservation-id="${id}">Cancel Reservation</button></li>
                            </ul>
                        `;

                        // Add event listener for cancel button to cancel the reservation
                        const cancelButton = document.getElementById('cancel-button');
                        cancelButton.addEventListener('click', function () {
                            cancelReservation(id); // Call cancelReservation function when the button is clicked
                        });
                    }
                })
                .catch(error => {
                    console.error('Error fetching reservation:', error); // Log the error if fetching fails
                    reservationInfo.innerHTML = '<p>Failed to load reservation. Please try again later.</p>';
                });
        } else {
            alert('Contact number is required.'); // Show an alert if the contact number is empty
        }
    });

    // Function to cancel the reservation
    function cancelReservation(reservationId) {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you really want to cancel this reservation?',
            icon: 'warning',
            showCancelButton: true, // Show cancel button
            confirmButtonText: 'Yes',  // Change confirm button text to 'Yes'
            cancelButtonText: 'No',  // Change cancel button text to 'No'
        }).then((result) => {
            if (result.isConfirmed) {
                // Send a request to cancel the reservation
                fetch(`http://localhost:3000/api/cancel-reservation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: reservationId }), // Send reservation ID in the request body
                })
                    .then(response => response.json()) // Parse the response as JSON
                    .then(result => {
                        if (result.success) {
                            // If cancellation is successful, show a success message
                            Swal.fire('Cancelled', 'Your reservation has been cancelled.', 'success');
                            reservationInfo.innerHTML = '<p>Your reservation has been canceled.</p>';
                        } else {
                            // If there was an error during cancellation, show an error message
                            Swal.fire('Error', result.message || 'Failed to cancel the reservation.', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error canceling reservation:', error); // Log any errors during cancellation
                        Swal.fire('Error', 'An error occurred while canceling the reservation. Please try again later.', 'error');
                    });
            }
        });
    }
});
