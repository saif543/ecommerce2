'use client'

import Swal from 'sweetalert2'

const toast = {
    success: (message, title = 'Success!') => {
        Swal.fire({
            icon: 'success',
            title,
            text: message,
            timer: 2000,
            showConfirmButton: false,
            confirmButtonColor: '#FF6B35',
        })
    },
    error: (message, title = 'Error') => {
        Swal.fire({
            icon: 'error',
            title,
            text: message,
            confirmButtonColor: '#FF6B35',
        })
    },
    warning: (message, title = 'Warning') => {
        Swal.fire({
            icon: 'warning',
            title,
            text: message,
            confirmButtonColor: '#FF6B35',
        })
    },
    info: (message, title = 'Info') => {
        Swal.fire({
            icon: 'info',
            title,
            text: message,
            confirmButtonColor: '#FF6B35',
        })
    },
}

export default toast
