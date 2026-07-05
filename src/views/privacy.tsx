"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { staggerContainerVariants, listItemVariants } from "@/lib/animations";

export default function PrivacyPage() {
  // Ensure page starts at the top
  useEffect(() => {
    // Force scroll to top with multiple methods to ensure it works
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Scroll immediately
    scrollToTop();

    // Also scroll after a small delay to ensure it sticks
    const timeout = setTimeout(scrollToTop, 50);

    return () => clearTimeout(timeout);
  }, []);
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 pt-20 md:pt-24 flex-grow flex flex-col text-white">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainerVariants}
        className="space-y-8 text-justify"
      >
        <motion.div variants={listItemVariants} className="text-center mb-10">
          <ShieldCheck className="mx-auto h-12 w-12 text-purple-500 mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white/95">
            Privacy Policy
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Last Updated: October 20, 2025
          </p>
        </motion.div>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            1. Introduction
          </h2>
          <p className="text-white/80 text-justify">
            This Privacy Policy explains how <strong>vacansee-au</strong>{" "}
            (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;, or &quot;the
            Service&quot;) collects, uses, stores, transfers, and protects your
            Personal Data. We are committed to protecting your privacy and
            complying with{" "}
            <strong>
              UAE Federal Decree-Law No. 45 of 2021 on the Protection of
              Personal Data
            </strong>{" "}
            (&quot;UAE PDPL&quot;) and all applicable data protection laws in
            the United Arab Emirates.
          </p>
          <p className="text-white/80 text-justify">
            <strong>Please read this Policy carefully.</strong> By accessing or
            using vacansee-au, you acknowledge that you have read, understood, and
            agree to the practices described herein.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            2. Definitions
          </h2>
          <div className="text-white/80 space-y-2 text-justify">
            <p>
              <strong>Personal Data:</strong> Any data relating to an identified
              or identifiable natural person (you), including name, email
              address, profile photograph, IP address, device identifiers, and
              online identifiers.
            </p>
            <p>
              <strong>Sensitive Personal Data:</strong> Personal Data revealing
              racial or ethnic origin, political opinions, religious or
              philosophical beliefs, trade union membership, genetic data,
              biometric data, health data, or data concerning sex life or sexual
              orientation. We do not intentionally collect Sensitive Personal
              Data.
            </p>
            <p>
              <strong>Data Subject:</strong> You, the natural person to whom
              Personal Data relates.
            </p>
            <p>
              <strong>Controller:</strong> vacansee-au, which determines the
              purposes and means of processing your Personal Data.
            </p>
            <p>
              <strong>Processor:</strong> A third party that processes Personal
              Data on our behalf under our instructions (e.g., Supabase,
              Vercel).
            </p>
          </div>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            3. Controller Information and Contact Details
          </h2>
          <div className="text-white/80">
            <p>
              <strong>Controller Name:</strong> vacansee-au
            </p>
            <p>
              <strong>Contact:</strong>{" "}
              <a
                href="https://tahayparker.vercel.app/contact"
                className="underline text-purple-500"
              >
                https://tahayparker.vercel.app/contact
              </a>
            </p>
            <p>
              <strong>Jurisdiction:</strong> United Arab Emirates
            </p>
          </div>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            4. Personal Data We Collect
          </h2>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            4.1 Account and Authentication Data
          </h3>
          <p className="text-white/80">
            When you create an account or sign in using a third-party OAuth
            provider (Google, GitHub, or Microsoft/Azure), we collect:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Name</strong> (as provided by the OAuth provider)
            </li>
            <li>
              <strong>Email address</strong>
            </li>
            <li>
              <strong>Profile picture/avatar</strong> (if provided by the OAuth
              provider)
            </li>
            <li>
              <strong>Unique user identifier</strong> (generated by Supabase
              Auth)
            </li>
            <li>
              <strong>OAuth provider name</strong> (e.g., Google, GitHub, Azure)
            </li>
            <li>
              <strong>Authentication tokens</strong> and session data (stored
              securely and encrypted)
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            4.2 Device and Usage Data
          </h3>
          <p className="text-white/80">
            We collect technical information automatically when you access or
            use the Service:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>IP address</li>
            <li>Browser type, version, and language settings</li>
            <li>Operating system</li>
            <li>
              Device type and identifiers (e.g., device model, screen
              resolution)
            </li>
            <li>Referrer URL (the website you came from)</li>
            <li>
              Pages viewed, features used, and actions taken within the Service
            </li>
            <li>Date, time, and duration of your visits and sessions</li>
            <li>
              Performance and diagnostic data (e.g., page load times, errors,
              crashes)
            </li>
          </ul>
          <p className="text-white/80">
            This data is collected via <strong>Vercel Analytics</strong> and
            standard web server logs.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            4.3 Cookies and Similar Technologies
          </h3>
          <p className="text-white/80">
            We use cookies and similar tracking technologies to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Authenticate your session</strong> and keep you signed in
              (essential cookies)
            </li>
            <li>
              <strong>Analyze usage patterns and performance</strong> (analytics
              cookies via Vercel Analytics)
            </li>
          </ul>
          <p className="text-white/80 mt-2">
            You can manage cookie preferences through your browser settings.
            Note that blocking essential cookies may prevent you from signing in
            or using core features of the Service.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            4.4 User-Generated Content
          </h3>
          <p className="text-white/80">
            Currently, the Service does not provide functionality for users to
            submit, upload, or create content such as files, documents, notes,
            or other materials. We do not collect or store user-generated
            content at this time. If this functionality is added in the future,
            we will update this Privacy Policy accordingly and notify you of any
            changes.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            4.5 Communications and Support Data
          </h3>
          <p className="text-white/80">
            If you contact us for support, feedback, or inquiries via our
            contact page, we collect:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              Your email address and any other contact information you provide
            </li>
            <li>The content of your message or inquiry</li>
            <li>Any attachments or additional information you submit</li>
          </ul>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            5. Legal Bases and Purposes of Processing
          </h2>
          <p className="text-white/80">
            We process your Personal Data only where we have a lawful basis
            under the UAE PDPL:
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            5.1 Performance of a Contract
          </h3>
          <p className="text-white/80">We process your Personal Data to:</p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>Create, manage, and authenticate your account</li>
            <li>Provide access to the Service and its features</li>
            <li>
              Enable core functionality (e.g., saving your preferences, syncing
              data)
            </li>
            <li>Fulfill our obligations under our Terms of Service</li>
          </ul>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            5.2 Legitimate Interests
          </h3>
          <p className="text-white/80">
            We process Personal Data where necessary for our legitimate
            interests, balanced against your rights and freedoms:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Security and fraud prevention:</strong> Detecting,
              preventing, and responding to security incidents, unauthorized
              access, abuse, or fraudulent activity
            </li>
            <li>
              <strong>Service improvement:</strong> Analyzing usage patterns to
              improve performance, reliability, user experience, and develop new
              features
            </li>
            <li>
              <strong>Technical operations:</strong> Maintaining,
              troubleshooting, and optimizing our infrastructure, servers, and
              applications
            </li>
            <li>
              <strong>Legal compliance:</strong> Responding to legal requests,
              enforcing our Terms of Service, and protecting our legal rights
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            5.3 Legal Obligations
          </h3>
          <p className="text-white/80">
            We process Personal Data to comply with applicable laws,
            regulations, legal processes, or enforceable governmental requests.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            6. Data Processing Controls
          </h2>
          <p className="text-white/80">
            We process Personal Data in accordance with the following
            principles:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Lawfulness, Fairness, and Transparency:</strong>{" "}
              Processing is conducted lawfully, fairly, and in a transparent
              manner
            </li>
            <li>
              <strong>Purpose Limitation:</strong> Personal Data is collected
              for specified, explicit, and legitimate purposes and not processed
              in a manner incompatible with those purposes
            </li>
            <li>
              <strong>Data Minimization:</strong> We collect only the Personal
              Data that is adequate, relevant, and limited to what is necessary
              for the stated purposes
            </li>
            <li>
              <strong>Accuracy:</strong> We take reasonable steps to ensure
              Personal Data is accurate and up to date
            </li>
            <li>
              <strong>Storage Limitation:</strong> Personal Data is retained
              only for as long as necessary to fulfill the purposes for which it
              was collected or as required by law
            </li>
            <li>
              <strong>Security:</strong> We implement appropriate technical and
              organizational measures to protect Personal Data
            </li>
            <li>
              <strong>Accountability:</strong> We are responsible for and can
              demonstrate compliance with these principles
            </li>
          </ol>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            7. Data Sharing and Disclosure
          </h2>
          <p className="text-white/80">
            We <strong>do not sell, rent, or trade</strong> your Personal Data
            to third parties. We share Personal Data only in the limited
            circumstances described below:
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            7.1 Service Providers (Processors)
          </h3>
          <p className="text-white/80">
            We engage trusted third-party service providers to perform functions
            on our behalf:
          </p>

          <div className="ml-4 space-y-3">
            <div>
              <h4 className="text-lg font-semibold text-white/85">
                Supabase (Database, Authentication, and Storage)
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
                <li>
                  <strong>Purpose:</strong> User authentication (OAuth), account
                  management, database storage
                </li>
                <li>
                  <strong>Data Shared:</strong> Account data (name, email,
                  profile picture, user ID), authentication tokens
                </li>
                <li>
                  <strong>Privacy Policy:</strong>{" "}
                  <a
                    href="https://supabase.com/privacy"
                    className="underline text-purple-500"
                  >
                    https://supabase.com/privacy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white/85">
                Vercel (Hosting, Content Delivery, Analytics)
              </h4>
              <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
                <li>
                  <strong>Purpose:</strong> Web application hosting, content
                  delivery, performance monitoring, and usage analytics
                </li>
                <li>
                  <strong>Data Shared:</strong> Device and usage data (IP
                  address, browser type, pages viewed, timestamps, performance
                  metrics)
                </li>
                <li>
                  <strong>Privacy Policy:</strong>{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    className="underline text-purple-500"
                  >
                    https://vercel.com/legal/privacy-policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            7.2 OAuth Providers
          </h3>
          <p className="text-white/80">
            When you sign in using a third-party OAuth provider:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              The OAuth provider shares your basic profile information with us
              as permitted by you during the sign-in process
            </li>
            <li>
              Your use of the OAuth provider is governed by that provider&apos;s
              own terms and privacy policy:
            </li>
            <ul className="list-disc list-inside space-y-1 text-white/80 pl-8 mt-2">
              <li>
                <strong>Google:</strong>{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="underline text-purple-500"
                >
                  https://policies.google.com/privacy
                </a>
              </li>
              <li>
                <strong>GitHub:</strong>{" "}
                <a
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
                  className="underline text-purple-500"
                >
                  GitHub Privacy Statement
                </a>
              </li>
              <li>
                <strong>Microsoft/Azure:</strong>{" "}
                <a
                  href="https://privacy.microsoft.com/privacystatement"
                  className="underline text-purple-500"
                >
                  Microsoft Privacy Statement
                </a>
              </li>
            </ul>
          </ul>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            7.3 Legal Requirements
          </h3>
          <p className="text-white/80">
            We may disclose Personal Data if required or permitted by law,
            including to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              Comply with legal obligations, court orders, subpoenas, warrants,
              or other valid legal processes
            </li>
            <li>
              Cooperate with law enforcement, regulatory authorities, or
              governmental bodies in the UAE or abroad when required by law
            </li>
            <li>
              Enforce our Terms of Service, investigate and prevent fraud,
              security incidents, or violations of our policies
            </li>
            <li>
              Protect the rights, property, safety, or security of vacansee-au, our
              users, or the public, including in emergencies
            </li>
          </ul>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            8. Data Retention
          </h2>
          <p className="text-white/80">
            We retain Personal Data only for as long as necessary to fulfill the
            purposes for which it was collected, comply with legal obligations,
            resolve disputes, and enforce our agreements.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            8.1 Retention Periods
          </h3>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Account Data:</strong> Retained while your account is
              active. Upon account deletion, we will delete your account data
              within 30 days, unless retention is required by law
            </li>
            <li>
              <strong>Authentication and Session Data:</strong> Retained for the
              duration of your session. Session tokens expire automatically and
              are deleted upon logout or expiration
            </li>
            <li>
              <strong>Usage and Analytics Data (Vercel Analytics):</strong>{" "}
              Aggregated and anonymized usage data may be retained for up to 12
              months for analytical and service improvement purposes
            </li>
            <li>
              <strong>Logs (Security, Diagnostic, Server Logs):</strong>{" "}
              Retained for up to 30 days for security monitoring,
              troubleshooting, and fraud prevention
            </li>
            <li>
              <strong>Support Communications:</strong> Retained for up to 2
              years or as long as necessary to address your inquiry and comply
              with legal obligations
            </li>
          </ul>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            9. Cross-Border Data Transfers
          </h2>
          <p className="text-white/80">
            Our Processors (Supabase and Vercel) may process and store your
            Personal Data on servers located outside the United Arab Emirates,
            including in jurisdictions that may not provide an equivalent level
            of data protection as the UAE.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            9.1 Safeguards for International Transfers
          </h3>
          <p className="text-white/80">
            Where we transfer Personal Data outside the UAE, we ensure
            appropriate safeguards are in place:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Necessity to perform a contract with you</strong> (e.g.,
              to provide the Service you requested)
            </li>
            <li>
              <strong>Legitimate interests</strong> (subject to appropriate
              safeguards and balancing of your rights)
            </li>
            <li>
              <strong>Your explicit consent</strong> (where required and
              obtained in accordance with UAE PDPL)
            </li>
          </ul>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            10. Your Rights Under UAE PDPL
          </h2>
          <p className="text-white/80">
            As a Data Subject under the UAE PDPL, you have the following rights.
            You may exercise these rights by contacting us at{" "}
            <a
              href="https://tahayparker.vercel.app/contact"
              className="underline text-purple-500"
            >
              https://tahayparker.vercel.app/contact
            </a>
            .
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white/85">
                10.1 Right to Information
              </h3>
              <p className="text-white/80">
                You have the right to request information about the types of
                Personal Data we are processing, purposes of processing,
                retention periods, and recipients of your data.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white/85">
                10.2 Right of Access
              </h3>
              <p className="text-white/80">
                You have the right to obtain a copy of your Personal Data that
                we hold, free of charge, in a commonly used, machine-readable
                format where technically feasible.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white/85">
                10.3 Right to Correction
              </h3>
              <p className="text-white/80">
                You have the right to request correction of inaccurate or
                incomplete Personal Data. We will correct or complete your data
                without undue delay.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white/85">
                10.4 Right to Erasure (Deletion)
              </h3>
              <p className="text-white/80">
                You have the right to request deletion of your Personal Data in
                certain circumstances, such as when the data is no longer
                necessary for the purposes for which it was collected, or you
                withdraw your consent.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white/85">
                10.5 Right to Data Portability
              </h3>
              <p className="text-white/80">
                You have the right to receive your Personal Data in a
                structured, commonly used, and machine-readable format and
                request that we transmit your data directly to another
                controller where technically feasible.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white/85">
                10.6 How to Exercise Your Rights
              </h3>
              <p className="text-white/80">
                To exercise any of the above rights, please contact us at{" "}
                <a
                  href="https://tahayparker.vercel.app/contact"
                  className="underline text-purple-500"
                >
                  https://tahayparker.vercel.app/contact
                </a>
                . We will respond to your request within 30 days. There is no
                fee for exercising your rights, unless your request is
                manifestly unfounded, excessive, or repetitive.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            11. Data Security
          </h2>
          <p className="text-white/80">
            We implement comprehensive technical and organizational security
            measures to protect your Personal Data from unauthorized access,
            disclosure, alteration, destruction, loss, or misuse.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            11.1 Technical Measures
          </h3>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Encryption:</strong> Personal Data is encrypted both in
              transit (using TLS/SSL) and at rest (using industry-standard
              encryption algorithms)
            </li>
            <li>
              <strong>Access Controls:</strong> Strict access controls ensure
              that only authorized systems can access Personal Data on a
              need-to-know basis
            </li>
            <li>
              <strong>Secure Authentication:</strong> We use Supabase Auth with
              OAuth providers that employ robust authentication mechanisms,
              including secure token management
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            11.2 Organizational Measures
          </h3>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              <strong>Data Minimization:</strong> We collect only the minimum
              Personal Data necessary for the stated purposes
            </li>
            <li>
              <strong>Incident Response Plan:</strong> We maintain a documented
              incident response plan to detect, respond to, and recover from
              Data Breaches
            </li>
            <li>
              <strong>Data Backup and Recovery:</strong> Regular backups are
              performed to ensure data availability and business continuity in
              case of system failures
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            11.3 Limitations
          </h3>
          <p className="text-white/80">
            While we strive to protect your Personal Data, no method of
            transmission over the internet or electronic storage is 100% secure.
            We cannot guarantee absolute security, and you transmit data at your
            own risk. If you suspect unauthorized access to your account, please
            contact us immediately.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            12. Data Breach Notification
          </h2>
          <p className="text-white/80">
            In the event of a Data Breach that is likely to result in a risk to
            your rights, privacy, or confidentiality, we will:
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            12.1 Notification to the UAE Data Office
          </h3>
          <p className="text-white/80">
            We will notify the UAE Data Office without undue delay and, where
            feasible, within 72 hours of becoming aware of the breach.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            12.2 Notification to Data Subjects
          </h3>
          <p className="text-white/80">
            If the Data Breach is likely to result in a high risk to your
            privacy, confidentiality, or security, we will notify you without
            undue delay via email or prominent notice on the Service.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            13. Complaints and Grievances
          </h2>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            13.1 Internal Complaints
          </h3>
          <p className="text-white/80">
            If you believe we have violated your rights or this Privacy Policy,
            you may submit a complaint to us at{" "}
            <a
              href="https://tahayparker.vercel.app/contact"
              className="underline text-purple-500"
            >
              https://tahayparker.vercel.app/contact
            </a>
            . We will acknowledge receipt within 7 days and respond within 30
            days.
          </p>

          <h3 className="text-xl font-semibold text-white/85 mt-4">
            13.2 Grievance Procedure (Appeal)
          </h3>
          <p className="text-white/80">
            If you are dissatisfied with our response, you may submit a written
            grievance within 30 days of receiving our response. We will review
            your grievance and issue a final decision within 30 days.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            14. Children&apos;s Privacy
          </h2>
          <p className="text-white/80">
            The Service is not directed to children under the age of 13 (or the
            minimum age required for consent under UAE law, whichever is
            higher). We do not knowingly collect Personal Data from children
            under 13 without verifiable parental or guardian consent.
          </p>
          <p className="text-white/80">
            If you are a parent or guardian and believe your child under 13 has
            provided Personal Data to us, please contact us immediately at{" "}
            <a
              href="https://tahayparker.vercel.app/contact"
              className="underline text-purple-500"
            >
              https://tahayparker.vercel.app/contact
            </a>
            .
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            15. Changes to This Privacy Policy
          </h2>
          <p className="text-white/80">
            We may update this Privacy Policy from time to time to reflect
            changes in our practices, legal requirements, or Service features.
            When we make changes, we will:
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/80 pl-4">
            <li>
              Update the &quot;Last Updated&quot; date at the top of this Policy
            </li>
            <li>Post the revised Policy on the Service</li>
            <li>
              For material changes, we will provide prominent notice (e.g.,
              email notification, banner on the Service) and, where required by
              law, obtain your consent
            </li>
          </ul>
          <p className="text-white/80">
            Your continued use of the Service after the effective date of the
            updated Policy constitutes your acceptance of the changes. If you do
            not agree with the updated Policy, you must stop using the Service
            and may request deletion of your account and Personal Data.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            16. Legal Compliance and Enforcement
          </h2>
          <p className="text-white/80">
            This Privacy Policy and our processing of your Personal Data are
            governed by and construed in accordance with the laws of the United
            Arab Emirates, including UAE Federal Decree-Law No. 45 of 2021 on
            the Protection of Personal Data.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            17. Contact Us
          </h2>
          <p className="text-white/80">
            For any questions, concerns, requests, or complaints regarding this
            Privacy Policy or our processing of your Personal Data, please
            contact us at{" "}
            <a
              href="https://tahayparker.vercel.app/contact"
              className="underline text-purple-500"
            >
              https://tahayparker.vercel.app/contact
            </a>
          </p>
          <p className="text-white/80">
            We are committed to addressing your inquiries promptly and in
            accordance with applicable law.
          </p>
        </motion.section>

        <motion.section variants={listItemVariants} className="space-y-3">
          <h2 className="text-2xl font-semibold text-white/90 border-b border-white/20 pb-2">
            18. Acknowledgment and Consent
          </h2>
          <p className="text-white/80">
            By using vacansee-au, you acknowledge that:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-white/80 pl-4">
            <li>You have read, understood, and agree to this Privacy Policy</li>
            <li>
              You understand your rights as a Data Subject under UAE PDPL and
              how to exercise them
            </li>
            <li>
              You acknowledge that cross-border data transfers to Processors
              outside the UAE are necessary to provide the Service and are
              subject to appropriate safeguards
            </li>
          </ol>
          <p className="text-white/80 mt-3">
            If you do not agree with this Privacy Policy, please do not use the
            Service.
          </p>
        </motion.section>
      </motion.div>
    </div>
  );
}
