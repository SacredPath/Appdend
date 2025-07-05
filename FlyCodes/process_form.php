<?php
/**
 * Appdend - Contact Form Handler
 * 
 * This script processes app development inquiries and sends emails
 */

// Disable error display for users (keep errors in logs only)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set security headers
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Start session for CSRF protection
session_start();

// Function to sanitize input data
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

// Function to validate input length
function validate_length($data, $min, $max) {
    $length = mb_strlen($data, 'UTF-8');
    return ($length >= $min && $length <= $max);
}

// Function to implement rate limiting
function check_rate_limit($ip) {
    $rate_limit_file = 'rate_limit.txt';
    $current_time = time();
    $rate_limit_period = 3600; // 1 hour
    $max_requests = 10; // Maximum 10 requests per hour
    
    // Create or load rate limit data
    if (!file_exists($rate_limit_file)) {
        $rate_data = [];
    } else {
        $rate_data = json_decode(file_get_contents($rate_limit_file), true) ?: [];
    }
    
    // Clean up old entries
    foreach ($rate_data as $stored_ip => $data) {
        if ($current_time - $data['time'] > $rate_limit_period) {
            unset($rate_data[$stored_ip]);
        }
    }
    
    // Check if IP is rate limited
    if (isset($rate_data[$ip])) {
        if ($rate_data[$ip]['count'] >= $max_requests && $current_time - $rate_data[$ip]['time'] < $rate_limit_period) {
            return false; // Rate limited
        }
        
        // Update count if within time period
        if ($current_time - $rate_data[$ip]['time'] < $rate_limit_period) {
            $rate_data[$ip]['count']++;
        } else {
            // Reset count if time period has passed
            $rate_data[$ip] = ['time' => $current_time, 'count' => 1];
        }
    } else {
        // First request from this IP
        $rate_data[$ip] = ['time' => $current_time, 'count' => 1];
    }
    
    // Save updated rate limit data
    file_put_contents($rate_limit_file, json_encode($rate_data));
    return true; // Not rate limited
}

// Check if form was submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get client IP for rate limiting
    $client_ip = $_SERVER['REMOTE_ADDR'];
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $client_ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    }
    
    // Check rate limiting
    if (!check_rate_limit($client_ip)) {
        error_log("Rate limit exceeded for IP: $client_ip");
        echo json_encode(["status" => "success", "message" => "Thank you for your message. We'll get back to you soon!"]);
        exit;
    }
    
    // Validate CSRF token if implemented
    if (isset($_POST['csrf_token']) && isset($_SESSION['csrf_token'])) {
        if ($_POST['csrf_token'] !== $_SESSION['csrf_token']) {
            error_log("CSRF token validation failed");
            echo json_encode(["status" => "success", "message" => "Thank you for your message. We'll get back to you soon!"]);
            exit;
        }
    }
    
    // Get form data and sanitize
    $name = sanitize_input($_POST["name"]);
    $email = sanitize_input($_POST["email"]);
    $subject = sanitize_input($_POST["subject"]);
    $message = sanitize_input($_POST["message"]);
    
    // Validate input lengths
    if (!validate_length($name, 2, 100) || !validate_length($subject, 2, 100) || !validate_length($message, 10, 1000)) {
        error_log("Form submission error: Invalid input length");
        echo json_encode(["status" => "success", "message" => "Thank you for your message. We'll get back to you soon!"]);
        exit;
    }
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // Log the error but don't show it to the user
        error_log("Form submission error: Invalid email format - $email");
        echo json_encode(["status" => "success", "message" => "Thank you for your message. We'll get back to you soon!"]);
        exit;
    }
    
    // Email configuration
    $to = "contact@appdend.com";
    $email_subject = "New Website Request: " . $subject;
    
    // Create email body with HTML formatting
    $email_body = "
    <html>
    <head>
        <title>New Website Request</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 15px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .footer { text-align: center; padding: 10px; font-size: 12px; color: #6c757d; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #007bff; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>New Website Request</h2>
            </div>
            <div class='content'>
                <div class='field'>
                    <span class='label'>Name:</span> $name
                </div>
                <div class='field'>
                    <span class='label'>Email:</span> $email
                </div>
                <div class='field'>
                    <span class='label'>Website Type:</span> $subject
                </div>
                <div class='field'>
                    <span class='label'>Requirements:</span><br>
                    $message
                </div>
            </div>
            <div class='footer'>
                <p>This email was sent from the contact form on FlyCodes.com</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Set email headers
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: $name <$email>" . "\r\n";
    $headers .= "Reply-To: $email" . "\r\n";
    
    // Send email
    $mail_sent = mail($to, $email_subject, $email_body, $headers);
    
    // Log the attempt regardless of success
    if ($mail_sent) {
        error_log("Form submission successful: Email sent to $to from $email");
    } else {
        error_log("Form submission error: Failed to send email to $to from $email");
    }
    
    // Send auto-reply to the customer
    $auto_reply_subject = "Thank you for contacting FlipCodes.com";
    $auto_reply_body = "
    <html>
    <head>
        <title>Thank you for contacting FlipCodes.com</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 15px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .footer { text-align: center; padding: 10px; font-size: 12px; color: #6c757d; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>Thank You for Contacting Appdend</h2>
            </div>
            <div class='content'>
                <p>Dear $name,</p>
                <p>Thank you for your interest in our AI-powered website development services. We have received your request and will get back to you shortly.</p>
                <p>Here's a summary of your request:</p>
                <ul>
                    <li><strong>Website Type:</strong> $subject</li>
                </ul>
                <p>Our team will review your requirements and contact you within 24 hours to discuss your project in detail.</p>
                <p>If you have any immediate questions, please don't hesitate to contact us:</p>
                <ul>
                    <li>WhatsApp: <a href='https://wa.me/23473103194'>+234 816 551 9321</a></li>
                    <li>Phone: <a href='tel:+2348165519321'>+234 816 551 9321</a></li>
                </ul>
                <p>Best regards,<br>The FlipCodes Team</p>
            </div>
            <div class='footer'>
                <p>&copy; 2024 FlipCodes.com - AI-Powered Website Creation</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $auto_reply_headers = "MIME-Version: 1.0" . "\r\n";
    $auto_reply_headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $auto_reply_headers .= "From: FlipCodes.com <noreply@flipcodes.com>" . "\r\n";
    
    mail($email, $auto_reply_subject, $auto_reply_body, $auto_reply_headers);
    
    // Always return success to the user, regardless of actual outcome
    echo json_encode(["status" => "success", "message" => "Thank you for your message. We'll get back to you soon!"]);
} else {
    // If not a POST request, redirect to the homepage
    header("Location: index.html");
    exit;
}
?>
