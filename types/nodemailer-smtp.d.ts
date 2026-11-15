// The SMTP transport is versioned independently of Auth.js's unused optional email provider.
declare module "nodemailer-smtp" {
  import nodemailer from "nodemailer";
  export default nodemailer;
}
