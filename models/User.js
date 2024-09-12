const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = mongoose.Schema(
  {
    oauthId: { type: String, required: false },
    first_name: {
      type: String,
      require: [true, "Please Add a name"],
    },
    last_name: {
      type: String,
      require: false,
    },
    email: {
      type: String,
      require: [true, "Please Add a email"],
      unique: true,
      // remove space around the email==>trim
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid emaial",
      ],
    },
    password: {
      type: String,
      // require: [true, "Please Add a password"], //if we face error when oauth register then remove require
      required: function () {
        return !this.oauthId;
      }, // The password is required only if the user does not have a googleId (non-OAuth users)
      minLength: [6, "password must be more than 6 characters"],
      // maxLength: [23, "password must be less than 23 characters"],
    },
    photo: {
      type: String,
      require: [true, "Please Add a photo"],
      default:
        "https://res.cloudinary.com/dz4augbi8/image/upload/v1725962982/o-auth-project/common/128_apeydj.png",
    },
    phone: {
      type: String,
      default: "+ ",
    },
    bio: {
      type: String,
      maxLength: [250, "Bio must not be more than 250 characters"],
      default: "Add bio",
    },
    role: {
      type: Number,
      default: 0,
    },
    account_type: {
      type: String,
      default: "PUBLIC",
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

//   Encrypt password before saving to DB
userSchema.pre("save", async function (next) {
  // below line only modify when password change otherwise like name ,email,phone those time dont change simply ignore it
  // if this password not modify then i don't want to do anything just ignore next()
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});

module.exports = mongoose.model("User", userSchema);
