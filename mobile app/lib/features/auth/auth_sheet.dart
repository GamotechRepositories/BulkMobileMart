import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/theme.dart';
import '../../core/utils/validators.dart';
import 'auth_controller.dart';
import 'auth_state.dart';

class AuthSheet extends ConsumerStatefulWidget {
  const AuthSheet({super.key, required this.mode});

  final AuthModalMode mode;

  @override
  ConsumerState<AuthSheet> createState() => _AuthSheetState();
}

class _AuthSheetState extends ConsumerState<AuthSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _submitting = false;
  bool _showPassword = false;
  String? _error;

  bool get _isSignup => widget.mode == AuthModalMode.signup;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String? _validate() {
    if (_isSignup) {
      if (!Validators.isValidName(_nameController.text)) {
        return 'Name must be 1 or 2 words, letters only (e.g. Rahul or John Smith)';
      }
      if (!Validators.isValidPhone(_phoneController.text)) {
        return 'Phone must be 10 digits starting with 6, 7, 8, or 9';
      }
    }

    if (_emailController.text.trim().isEmpty) {
      return 'Email is required';
    }
    if (!Validators.isValidPassword(_passwordController.text)) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }

  Future<void> _submit() async {
    final validationError = _validate();
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final auth = ref.read(authControllerProvider.notifier);
      if (_isSignup) {
        await auth.signup(
          name: _nameController.text,
          email: _emailController.text,
          phone: _phoneController.text,
          password: _passwordController.text,
        );
      } else {
        await auth.login(
          email: _emailController.text,
          password: _passwordController.text,
        );
      }
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      setState(() => _error = authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 12,
          bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
        ),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _isSignup ? 'Sign Up' : 'Login',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      ref.read(authControllerProvider.notifier).closeAuthModal();
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              Text(
                _isSignup
                    ? 'Create your account to get started.'
                    : 'Enter your credentials to access your account.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
              const SizedBox(height: 20),
              if (_isSignup) ...[
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Name',
                    hintText: 'Rahul',
                  ),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone',
                    hintText: '9876543210',
                  ),
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email Address',
                  hintText: 'Enter your email',
                ),
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordController,
                decoration: InputDecoration(
                  labelText: 'Password',
                  hintText: 'Enter your password',
                  suffixIcon: IconButton(
                    onPressed: () =>
                        setState(() => _showPassword = !_showPassword),
                    icon: Icon(
                      _showPassword ? Icons.visibility_off : Icons.visibility,
                    ),
                  ),
                ),
                obscureText: !_showPassword,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: Text(
                  _submitting
                      ? 'Please wait...'
                      : (_isSignup ? 'Sign Up' : 'Login'),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  final nextMode = _isSignup
                      ? AuthModalMode.login
                      : AuthModalMode.signup;
                  ref.read(authControllerProvider.notifier).setAuthModal(nextMode);
                  Navigator.of(context).pop();
                  Future.microtask(() {
                    ref
                        .read(authControllerProvider.notifier)
                        .openAuthModal(nextMode);
                  });
                },
                child: Text(
                  _isSignup
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Sign Up",
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
